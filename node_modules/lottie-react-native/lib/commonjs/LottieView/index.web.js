"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.LottieView = void 0;
var _react = _interopRequireWildcard(require("react"));
var _utils = require("./utils");
var _dotlottieReact = require("@lottiefiles/dotlottie-react");
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function (e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != typeof e && "function" != typeof e) return { default: e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && {}.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n.default = e, t && t.set(e, n), n; }
const LottieView = exports.LottieView = /*#__PURE__*/(0, _react.forwardRef)(({
  source,
  speed,
  loop,
  webStyle,
  autoPlay,
  hover,
  direction,
  progress,
  onAnimationLoaded,
  onAnimationFailure,
  onAnimationFinish,
  onAnimationLoop
}, ref) => {
  const [dotLottie, setDotLottie] = (0, _react.useState)(null);
  const sources = (0, _utils.parsePossibleSources)(source);
  const dotLottieRefCallback = (0, _react.useCallback)(dotLottie => {
    setDotLottie(dotLottie);
  }, []);
  (0, _react.useEffect)(() => {
    if (dotLottie) {
      dotLottie.addEventListener('load', () => {
        onAnimationLoaded === null || onAnimationLoaded === void 0 || onAnimationLoaded();
      });
      dotLottie.addEventListener('loadError', e => {
        onAnimationFailure === null || onAnimationFailure === void 0 || onAnimationFailure(e.error.message);
      });
      dotLottie.addEventListener('complete', () => {
        onAnimationFinish === null || onAnimationFinish === void 0 || onAnimationFinish(false);
      });
      dotLottie.addEventListener('stop', () => {
        onAnimationFinish === null || onAnimationFinish === void 0 || onAnimationFinish(true);
      });
      dotLottie.addEventListener('pause', () => {
        onAnimationFinish === null || onAnimationFinish === void 0 || onAnimationFinish(true);
      });
      dotLottie.addEventListener('loop', () => {
        onAnimationLoop === null || onAnimationLoop === void 0 || onAnimationLoop();
      });
      return () => {
        dotLottie.removeEventListener('load');
        dotLottie.removeEventListener('loadError');
        dotLottie.removeEventListener('complete');
        dotLottie.removeEventListener('stop');
        dotLottie.removeEventListener('pause');
        dotLottie.removeEventListener('loop');
      };
    }
    return undefined;
  }, [dotLottie, onAnimationFailure, onAnimationFinish, onAnimationLoaded, onAnimationLoop]);
  (0, _react.useEffect)(() => {
    if (progress != undefined && __DEV__) {
      console.warn('lottie-react-native: progress is not supported on web');
    }
  }, [progress]);
  (0, _react.useImperativeHandle)(ref, () => {
    return {
      play: (s, e) => {
        if (!dotLottie) return;
        try {
          const bothDefined = s !== undefined && e !== undefined;
          const bothUndefined = s === undefined && e === undefined;
          const bothEqual = e === s;
          if (bothDefined) {
            if (bothEqual) {
              dotLottie.setFrame(e);
              dotLottie.play();
              return;
            }
            dotLottie.setSegment(s, e);
            return;
          }
          if (s !== undefined && e === undefined) {
            dotLottie.setFrame(s);
            dotLottie.play();
          }
          if (bothUndefined) {
            dotLottie.play();
          }
        } catch (error) {
          console.error(error);
        }
      },
      reset: () => {
        dotLottie === null || dotLottie === void 0 || dotLottie.setFrame(0);
      },
      pause: () => {
        dotLottie === null || dotLottie === void 0 || dotLottie.pause();
      },
      resume: () => {
        dotLottie === null || dotLottie === void 0 || dotLottie.play();
      }
    };
  }, [dotLottie]);
  if (!sources) {
    return null;
  }
  return /*#__PURE__*/_react.default.createElement(_dotlottieReact.DotLottieReact, {
    dotLottieRefCallback: dotLottieRefCallback,
    data: sources.sourceJson,
    src: sources.sourceDotLottieURI ?? sources.sourceURL ?? sources.sourceName,
    style: webStyle,
    autoplay: autoPlay,
    speed: speed,
    loop: loop,
    playOnHover: hover,
    mode: direction === -1 ? 'reverse' : 'forward'
  });
});
//# sourceMappingURL=index.web.js.map