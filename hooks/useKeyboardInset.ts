import { useCallback, useEffect, useRef, useState } from "react";
import { Keyboard, Platform, type LayoutChangeEvent } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Tracks the on-screen keyboard for a screen or a bottom sheet.
 *
 * `KeyboardAvoidingView` stops working on Android 15+ builds that run
 * edge-to-edge: `adjustResize` no longer shrinks the window, so the composer or
 * the sheet stays glued to the bottom of the screen and the keyboard covers it.
 * This hook listens to the keyboard events itself and reports how far the view
 * must be lifted. It also notices when the system *does* resize the window and
 * skips the extra lift so the content never jumps twice.
 *
 * Usage:
 *   const keyboard = useKeyboardInset();
 *   <View style={{ flex: 1 }} onLayout={keyboard.onLayout}>
 *     ...
 *     <View style={{ marginBottom: keyboard.bottomInset }} />
 *   </View>
 */
export function useKeyboardInset() {
  const insets = useSafeAreaInsets();
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [layoutHeight, setLayoutHeight] = useState(0);
  const closedHeight = useRef(0);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      const height = Math.round(event.endCoordinates?.height ?? 0);
      setKeyboardHeight(height > 0 ? height : 0);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  // Remember the height of the view while the keyboard is closed. If the window
  // shrinks when the keyboard opens, the system already made room for it.
  useEffect(() => {
    if (keyboardHeight === 0 && layoutHeight > 0) closedHeight.current = layoutHeight;
  }, [keyboardHeight, layoutHeight]);

  const keyboardVisible = keyboardHeight > 0;
  const resizedBySystem =
    keyboardVisible && closedHeight.current > 0 && layoutHeight > 0
      ? closedHeight.current - layoutHeight > 32
      : false;
  // Android reports the keyboard height *above* the navigation bar, while the
  // keyboard itself starts at the very bottom of the window. Add that bar back
  // (capped, some ROMs report a 0 bar while the IME is open) so the last row of
  // the composer or the sheet is never half-hidden.
  const navigationBar = Platform.OS === "android" ? Math.min(insets.bottom, 48) : 0;
  const bottomInset = keyboardVisible && !resizedBySystem ? keyboardHeight + navigationBar : 0;

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    setLayoutHeight(Math.round(event.nativeEvent.layout.height));
  }, []);

  return { keyboardHeight, keyboardVisible, bottomInset, layoutHeight, onLayout };
}
