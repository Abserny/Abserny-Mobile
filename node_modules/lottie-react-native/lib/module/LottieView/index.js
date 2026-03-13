function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
import React from 'react';
import { View, processColor } from 'react-native';
import { parsePossibleSources } from './utils';
import NativeLottieAnimationView, { Commands } from '../specs/LottieAnimationViewNativeComponent';
const defaultProps = {
  source: undefined,
  progress: 0,
  speed: 1,
  loop: true,
  autoPlay: false,
  enableMergePathsAndroidForKitKatAndAbove: false,
  enableSafeModeAndroid: false,
  cacheComposition: true,
  useNativeLooping: false,
  resizeMode: 'contain',
  colorFilters: [],
  textFiltersAndroid: [],
  textFiltersIOS: []
};
export class LottieView extends React.PureComponent {
  static defaultProps = defaultProps;
  constructor(props) {
    super(props);
    this.play = this.play.bind(this);
    this.reset = this.reset.bind(this);
    this.pause = this.pause.bind(this);
    this.resume = this.resume.bind(this);
    this.onAnimationFinish = this.onAnimationFinish.bind(this);
    this.captureRef = this.captureRef.bind(this);
    if (props.hover != undefined && __DEV__) {
      console.warn('lottie-react-native: hover is only supported on web');
    }
  }
  play(startFrame, endFrame) {
    Commands.play(this.lottieAnimationViewRef, startFrame ?? -1, endFrame ?? -1);
  }
  reset() {
    Commands.reset(this.lottieAnimationViewRef);
  }
  pause() {
    Commands.pause(this.lottieAnimationViewRef);
  }
  resume() {
    Commands.resume(this.lottieAnimationViewRef);
  }
  onAnimationFinish = evt => {
    var _this$props$onAnimati, _this$props;
    (_this$props$onAnimati = (_this$props = this.props).onAnimationFinish) === null || _this$props$onAnimati === void 0 || _this$props$onAnimati.call(_this$props, evt.nativeEvent.isCancelled);
  };
  onAnimationFailure = evt => {
    var _this$props$onAnimati2, _this$props2;
    (_this$props$onAnimati2 = (_this$props2 = this.props).onAnimationFailure) === null || _this$props$onAnimati2 === void 0 || _this$props$onAnimati2.call(_this$props2, evt.nativeEvent.error);
  };
  onAnimationLoaded = () => {
    var _this$props$onAnimati3, _this$props3;
    (_this$props$onAnimati3 = (_this$props3 = this.props).onAnimationLoaded) === null || _this$props$onAnimati3 === void 0 || _this$props$onAnimati3.call(_this$props3);
  };
  captureRef(ref) {
    if (ref === null) {
      return;
    }
    this.lottieAnimationViewRef = ref;
    if (this.props.autoPlay === true) {
      this.play();
    }
  }
  renderLottieView() {
    var _this$props$colorFilt;
    const {
      style,
      source,
      autoPlay,
      duration,
      textFiltersAndroid,
      textFiltersIOS,
      resizeMode,
      containerStyle,
      ...rest
    } = this.props;
    const sources = parsePossibleSources(source);
    const speed = duration && sources.sourceJson && source.fr ? Math.round(source.op / source.fr * 1000 / duration) : this.props.speed;
    const colorFilters = (_this$props$colorFilt = this.props.colorFilters) === null || _this$props$colorFilt === void 0 ? void 0 : _this$props$colorFilt.map(colorFilter => ({
      ...colorFilter,
      color: processColor(colorFilter.color)
    }));
    return /*#__PURE__*/React.createElement(NativeLottieAnimationView, _extends({
      ref: this.captureRef
    }, rest, {
      colorFilters: colorFilters,
      textFiltersAndroid: textFiltersAndroid,
      textFiltersIOS: textFiltersIOS,
      speed: speed,
      style: style,
      onAnimationFinish: this.onAnimationFinish,
      onAnimationFailure: this.onAnimationFailure,
      onAnimationLoaded: this.onAnimationLoaded,
      autoPlay: autoPlay,
      resizeMode: resizeMode
    }, sources));
  }
  render() {
    const {
      source,
      containerStyle
    } = this.props;
    if (source == null) {
      console.warn('LottieView needs `source` parameter, provided value for source:', source);
      return null;
    }
    if (containerStyle) {
      return /*#__PURE__*/React.createElement(View, {
        style: containerStyle,
        collapsable: false
      }, this.renderLottieView());
    }
    return this.renderLottieView();
  }
}
//# sourceMappingURL=index.js.map