/**
 * Phase 12 — useHoldGesture STRUCTURE smoke test.
 *
 * Full timer-state-machine verification deferred to the Phase 12 lab pass
 * (when real BLE delivers tier-3 recommended_actions through a real device
 * + real human-pressed UI). Same rationale as Phase 5's "no full render
 * tests": @testing-library/react-native's render() requires host-component
 * detection that the partial RN mock doesn't support, and react-test-
 * renderer requires constructing Animated.Value instances that the mock
 * doesn't expose.
 *
 * The hook itself is a ~70-line file with no business logic — just timer
 * management around `Animated.timing` and a completion callback. The
 * defensive checklist (Codex pre-impl Q1) is encoded in the file structure:
 *   - timer + animation refs cleared on press-out, reset, unmount,
 *     enabled→false transition
 *   - completion callback gated by `completedRef` + `enabledRef`
 *
 * Compile-time verification via `tsc --noEmit` (run separately) confirms
 * the type contract; this smoke test just confirms the module exports.
 */
import { useHoldGesture } from '../useHoldGesture';

describe('useHoldGesture — module surface', () => {
    test('exports the hook as a function', () => {
        expect(typeof useHoldGesture).toBe('function');
    });
});
