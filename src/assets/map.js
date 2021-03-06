import { nullTile, wallTile, floorTile } from "./tile";
import Entity from "./entity";
import { EntityRepository } from "./entities";
import ItemRepository from "./items";
import ROT from "rot-js";

const GameMap = function(tiles, player, easyMode) {
  this._tiles = tiles;
  this._depth = tiles.length;
  this._width = tiles[0].length;
  this._height = tiles[0][0].length;
  this._entities = {};
  this._items = {};
  this._scheduler = new ROT.Scheduler.Speed();
  this._engine = new ROT.Engine(this._scheduler);
  this._explored = [];
  this._player = player;
  this.setupExploredArray();
  this._fov = [];
  this.setupFov();
  this.addEntityAtRandomPosition(player, 0);
  for (let z = 0; z < this._depth; z++) {
    for (let i = 0; i < 20; i++) {
      const entity = EntityRepository.createRandom();
      this.addEntityAtRandomPosition(entity, z);
    }
    for (let i = 0; i < 5; i++) {
      const item = ItemRepository.createRandom();
      this.addItemAtRandomPosition(item, z);
    }
    if (z > 1) {
      for (let i = 0; i < 5; i++) {
        const zombie = EntityRepository.create("warrior zombie");
        this.addEntityAtRandomPosition(zombie, z);
      }
      for (let i = 0; i < 5; i++) {
        const troll = EntityRepository.create("troll");
        this.addEntityAtRandomPosition(troll, z);
      }
    }
  }
  if (easyMode) {
    this._finalBoss = EntityRepository.create('easyWarriorOrc')
    this.addEntityAtRandomPosition(this._finalBoss, 0)
  } else {
    this._finalBoss = EntityRepository.create('warriorOrc')
    this.addEntityAtRandomPosition(this._finalBoss, 5)
  }

};

GameMap.prototype.getFinalBoss = function() {
  return this._finalBoss
}

GameMap.prototype.getPlayer = function() {
  return this._player;
};
GameMap.prototype.getWidth = function() {
  return this._width;
};
GameMap.prototype.getHeight = function() {
  return this._height;
};
GameMap.prototype.getDepth = function() {
  return this._depth;
};

GameMap.prototype.getEngine = function() {
  return this._engine;
};

GameMap.prototype.getItemsAt = function(x, y, z) {
  return this._items[`${x},${y},${z}`];
};

GameMap.prototype.setItemsAt = function(x, y, z, items) {
  const key = [`${x},${y},${z}`];
  if (items.length === 0) {
    if (this._items[key]) {
      delete this._items[key];
    }
  } else {
    this._items[key] = items;
  }
};

GameMap.prototype.addItem = function(x, y, z, item) {
  const key = [`${x},${y},${z}`];
  if (this._items[key]) {
    this._items[key].push(item);
  } else {
    this._items[key] = [item];
  }
};

GameMap.prototype.addItemAtRandomPosition = function(item, z) {
  const position = this.getRandomFloorPosition(z);
  this.addItem(position.x, position.y, position.z, item);
};

GameMap.prototype.getEntities = function() {
  return this._entities;
};

GameMap.prototype.getEntityAt = function(x, y, z) {
  return this._entities[`${x},${y},${z}`];
};

GameMap.prototype.getEntitiesWithinRadius = function(
  centerX,
  centerY,
  centerZ,
  radius
) {
  const results = [];
  // Determine our bounds
  var leftX = centerX - radius;
  var rightX = centerX + radius;
  var topY = centerY - radius;
  var bottomY = centerY + radius;
  // Iterate through our entities, adding any which are within the bounds
  for (var key in this._entities) {
    var entity = this._entities[key];
    if (
      entity.getX() >= leftX &&
      entity.getX() <= rightX &&
      entity.getY() >= topY &&
      entity.getY() <= bottomY &&
      entity.getZ() == centerZ
    ) {
      results.push(entity);
    }
  }
  return results;
};

GameMap.prototype.updateEntityPosition = function(entity, oldX, oldY, oldZ) {
  if (typeof oldX === "number") {
    const oldKey = `${oldX},${oldY},${oldZ}`;
    if (this._entities[oldKey] == entity) {
      delete this._entities[oldKey];
    }
  }
  if (
    entity.getX() < 0 ||
    entity.getX() >= this._width ||
    entity.getY() < 0 ||
    entity.getY() >= this._height ||
    entity.getZ() < 0 ||
    entity.getZ() >= this._depth
  ) {
    throw new Error("Entity position is out of bounds");
  }
  const key = `${entity.getX()},${entity.getY()},${entity.getZ()}`;
  if (this._entities[key]) {
    // throw new Error("Tried to add an entity at an occupied position.");
  }
  this._entities[key] = entity;
};

GameMap.prototype.addEntity = function(entity) {
  entity.setMap(this);
  this.updateEntityPosition(entity);
  if (entity.hasMixin("Actor")) {
    this._scheduler.add(entity, true);
  }
};

GameMap.prototype.removeEntity = function(entity) {
  const key = `${entity.getX()},${entity.getY()},${entity.getZ()}`;
  if (this._entities[key] == entity) {
    delete this._entities[key];
  }
  if (entity.hasMixin("Actor")) {
    this._scheduler.remove(entity);
  }
};

GameMap.prototype.addEntityAtRandomPosition = function(entity, z) {
  const position = this.getRandomFloorPosition(z);
  entity.setX(position.x);
  entity.setY(position.y);
  entity.setZ(position.z);
  this.addEntity(entity);
};

GameMap.prototype.getTile = function(x, y, z) {
  if (
    x < 0 ||
    x >= this._width ||
    y < 0 ||
    y >= this._height ||
    z < 0 ||
    z >= this._depth
  ) {
    return nullTile;
  } else {
    return this._tiles[z][x][y] || nullTile;
  }
};

GameMap.prototype.lookInDirection = function(direction, distance) {
  const array = [];
  const xmod = direction == 8 || direction == 2 ? 0 : direction == 6 ? 1 : -1;
  const ymod = direction == 4 || direction == 6 ? 0 : direction == 2 ? 1 : -1;

  for (let i = 1; i < distance + 1; i++) {
    const x = this._player.getX() + xmod * i;
    const y = this._player.getY() + ymod * i;
    const z = this._player.getZ();
    if (this.getEntityAt(x, y, z)) {
      array.push(this.getEntityAt(x, y, z));
    } else {
      array.push({ tile: this.getTile(x, y, z), x, y, z });
    }
  }
  return array;
};

GameMap.prototype.isEmptyFloor = function(x, y, z) {
  return this.getTile(x, y, z) == floorTile && !this.getEntityAt(x, y, z);
};

GameMap.prototype.dig = function(x, y, z) {
  if (this.getTile(x, y, z).isDiggable()) {
    this._tiles[z][x][y] = floorTile;
  }
};

GameMap.prototype.getRandomFloorPosition = function(z) {
  let x = Math.floor(Math.random() * this._width);
  let y = Math.floor(Math.random() * this._height);
  return this.isEmptyFloor(x, y, z)
    ? { x, y, z }
    : this.getRandomFloorPosition(z);
};

GameMap.prototype.setupFov = function() {
  const map = this;
  for (let z = 0; z < this._depth; z++) {
    map._fov.push(
      new ROT.FOV.PreciseShadowcasting(
        (x, y) => {
          return !map.getTile(x, y, z).isBlockingLight();
        },
        { topology: 4 }
      )
    );
  }
};

GameMap.prototype.getFov = function(z) {
  return this._fov[z];
};

GameMap.prototype.setupExploredArray = function() {
  for (let z = 0; z < this._depth; z++) {
    this._explored[z] = new Array(this._width);
    for (let x = 0; x < this._width; x++) {
      this._explored[z][x] = new Array(this._height);
      for (let y = 0; y < this._height; y++) {
        this._explored[z][x][y] = false;
      }
    }
  }
};

GameMap.prototype.setExplored = function(x, y, z, state) {
  if (this.getTile(x, y, z) != nullTile) {
    this._explored[z][x][y] = state;
  }
};

GameMap.prototype.isExplored = function(x, y, z) {
  if (this.getTile(x, y, z) != nullTile) {
    return this._explored[z][x][y];
  }
  return false;
};

export default GameMap;
