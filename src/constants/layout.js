/**
 * constants/layout.js
 * Screen dimensions and spacing tokens.
 */

import { Dimensions } from 'react-native';

const { width: W, height: H } = Dimensions.get('window');

export const SCREEN_W = W;
export const SCREEN_H = H;

// Bracket corner size + border width (camera viewfinder corners)
export const BRACKET_SIZE   = 20;
export const BRACKET_WIDTH  = 2;
