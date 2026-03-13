import React, { forwardRef, useImperativeHandle, useEffect, useCallback, useState } from 'react';
import { parsePossibleSources } from './utils';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
const LottieView = /*#__PURE__*/forwardRef(({
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
  const [dotLottie, setDotLottie] = useState(null);
  const sources = parsePossibleSources(source);
  const dotLottieRefCallback = useCallback(dotLottie => {
    setDotLottie(dotLottie);
  }, []);
  useEffect(() => {
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
  useEffect(() => {
    if (progress != undefined && __DEV__) {
      console.warn('lottie-react-native: progress is not supported on web');
    }
  }, [progress]);
  useImperativeHandle(ref, () => {
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
  return /*#__PURE__*/React.createElement(DotLottieReact, {
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
export { LottieView };
//# sourceMappingURL=index.web.js.map