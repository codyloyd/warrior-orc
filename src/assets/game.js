import ROT from "rot-js";
import Colors from "./colors";
import Screen from "./screens";

const Game = {
  _display: null,
  _currentScreen: null,
  _screenWidth: 80,
  _screenHeight: 24,

  init: function() {
    this._display = new ROT.Display({
      width: this._screenWidth,
      height: this._screenHeight,
      fg: Colors.white,
      bg: Colors.black
    });
    const game = this;
    const bindEventToScreen = function(event) {
      window.addEventListener(event, function(e) {
        if (game._currentScreen !== null) {
          game._currentScreen.handleInput(event, e, game);
        }
      });
    };
    bindEventToScreen("keydown");
    // bindEventToScreen("keyup");
    // bindEventToScreen("keypress");
  },

  refresh: function() {
    this._currentScreen.render(this._display, this);
  },

  getDisplay: function() {
    return this._display;
  },

  getScreenWidth: function() {
    return this._screenWidth;
  },

  getScreenHeight: function() {
    return this._screenHeight;
  },

  switchScreen: function(screen) {
    if (this._currentScreen !== null) {
      this._currentScreen.exit();
    }
    this.getDisplay().clear();
    this._currentScreen = screen;
    if (!this._currentScreen !== null) {
      this._currentScreen.enter(this);
      this.refresh();
    }
  }
};

window.onload = function() {
  if (!ROT.isSupported()) {
    alert("The rot.js library isn't supported by your browser.");
  } else {
    Game.init();
    document.body.appendChild(Game.getDisplay().getContainer());
    Game.switchScreen(Screen.startScreen);
  }
};
