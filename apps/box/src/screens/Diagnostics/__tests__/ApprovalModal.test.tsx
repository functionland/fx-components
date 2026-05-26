/**
 * Phase 12 tests for ApprovalModal — tier 2 single-tap, tier 3 security code +
 * press-and-hold, dedup, cancellation safety.
 */
import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { ApprovalModal } from '../ApprovalModal';
import type { RecommendedActionEvent } from '../../../utils/bloxAiEvents';

jest.useFakeTimers();

const tier2Action: RecommendedActionEvent = {
    type: 'recommended_action',
    action_id: 'a-tier2',
    action_name: 'restart_fula',
    args: {},
    reasoning: 'Kubo API hung — restart will clear it.',
    confidence: 0.8,
    tier: 2,
    approval_token: 't'.repeat(80),
};

const tier3Action: RecommendedActionEvent = {
    type: 'recommended_action',
    action_id: 'a-tier3',
    action_name: 'reset',
    args: {},
    reasoning: 'Config seems corrupt; full reset proposed.',
    confidence: 0.6,
    tier: 3,
    approval_token: 'k'.repeat(80),
};

describe('ApprovalModal — tier 2', () => {
    test('renders action_name + reasoning + Approve button', () => {
        const onApprove = jest.fn();
        const { getByText, getByTestId } = render(
            <ApprovalModal
                action={tier2Action}
                onApprove={onApprove}
                onCancel={jest.fn()}
            />,
        );
        expect(getByText('restart_fula')).toBeTruthy();
        expect(getByText('Kubo API hung — restart will clear it.')).toBeTruthy();
        expect(getByTestId('approval-tier2-approve')).toBeTruthy();
    });

    test('Approve button fires onApprove with null security code', () => {
        const onApprove = jest.fn();
        const { getByTestId } = render(
            <ApprovalModal
                action={tier2Action}
                onApprove={onApprove}
                onCancel={jest.fn()}
            />,
        );
        fireEvent.press(getByTestId('approval-tier2-approve'));
        expect(onApprove).toHaveBeenCalledWith(null);
    });

    test('Approve button is disabled while executing (dedup guard)', () => {
        const onApprove = jest.fn();
        const { getByTestId } = render(
            <ApprovalModal
                action={tier2Action}
                onApprove={onApprove}
                onCancel={jest.fn()}
                executing
            />,
        );
        fireEvent.press(getByTestId('approval-tier2-approve'));
        expect(onApprove).not.toHaveBeenCalled();
    });

    test('does not render tier3-hold or security-code input for tier 2', () => {
        const { queryByTestId } = render(
            <ApprovalModal
                action={tier2Action}
                onApprove={jest.fn()}
                onCancel={jest.fn()}
            />,
        );
        expect(queryByTestId('approval-tier3-hold')).toBeNull();
        expect(queryByTestId('approval-security-code-input')).toBeNull();
    });
});

describe('ApprovalModal — tier 3', () => {
    test('renders security-code input + hold button (no tier-2 Approve)', () => {
        const { getByTestId, queryByTestId } = render(
            <ApprovalModal
                action={tier3Action}
                onApprove={jest.fn()}
                onCancel={jest.fn()}
            />,
        );
        expect(getByTestId('approval-security-code-input')).toBeTruthy();
        expect(getByTestId('approval-tier3-hold')).toBeTruthy();
        expect(queryByTestId('approval-tier2-approve')).toBeNull();
    });

    test('hold is disabled until security code is exactly 4 digits', () => {
        const onApprove = jest.fn();
        const { getByTestId } = render(
            <ApprovalModal
                action={tier3Action}
                onApprove={onApprove}
                onCancel={jest.fn()}
            />,
        );
        const codeInput = getByTestId('approval-security-code-input');
        const holdBtn = getByTestId('approval-tier3-hold');
        // No code yet → press triggers nothing
        fireEvent(holdBtn, 'pressIn');
        act(() => { jest.advanceTimersByTime(2000); });
        fireEvent(holdBtn, 'pressOut');
        expect(onApprove).not.toHaveBeenCalled();

        // Enter 3 digits — still disabled
        fireEvent.changeText(codeInput, '123');
        fireEvent(holdBtn, 'pressIn');
        act(() => { jest.advanceTimersByTime(2000); });
        fireEvent(holdBtn, 'pressOut');
        expect(onApprove).not.toHaveBeenCalled();
    });

    test('full 2-second hold with valid code fires onApprove(code)', () => {
        const onApprove = jest.fn();
        const { getByTestId } = render(
            <ApprovalModal
                action={tier3Action}
                onApprove={onApprove}
                onCancel={jest.fn()}
            />,
        );
        fireEvent.changeText(getByTestId('approval-security-code-input'), '1234');
        fireEvent(getByTestId('approval-tier3-hold'), 'pressIn');
        act(() => { jest.advanceTimersByTime(2000); });
        expect(onApprove).toHaveBeenCalledWith('1234');
    });

    test('releasing before 2s does NOT fire onApprove', () => {
        const onApprove = jest.fn();
        const { getByTestId } = render(
            <ApprovalModal
                action={tier3Action}
                onApprove={onApprove}
                onCancel={jest.fn()}
            />,
        );
        fireEvent.changeText(getByTestId('approval-security-code-input'), '1234');
        fireEvent(getByTestId('approval-tier3-hold'), 'pressIn');
        act(() => { jest.advanceTimersByTime(1500); });
        fireEvent(getByTestId('approval-tier3-hold'), 'pressOut');
        // Even if more time passes after release
        act(() => { jest.advanceTimersByTime(2000); });
        expect(onApprove).not.toHaveBeenCalled();
    });

    test('changing the security code mid-hold resets the timer', () => {
        const onApprove = jest.fn();
        const { getByTestId } = render(
            <ApprovalModal
                action={tier3Action}
                onApprove={onApprove}
                onCancel={jest.fn()}
            />,
        );
        const codeInput = getByTestId('approval-security-code-input');
        fireEvent.changeText(codeInput, '1234');
        fireEvent(getByTestId('approval-tier3-hold'), 'pressIn');
        act(() => { jest.advanceTimersByTime(1000); });
        // User edits code mid-hold
        fireEvent.changeText(codeInput, '5678');
        // Even if 5 more seconds pass, the prior timer was cleared
        act(() => { jest.advanceTimersByTime(5000); });
        expect(onApprove).not.toHaveBeenCalled();
    });
});

describe('ApprovalModal — cancellation + unmount safety', () => {
    test('unmount during pending hold does not leak timer / call onApprove', () => {
        const onApprove = jest.fn();
        const { getByTestId, unmount } = render(
            <ApprovalModal
                action={tier3Action}
                onApprove={onApprove}
                onCancel={jest.fn()}
            />,
        );
        fireEvent.changeText(getByTestId('approval-security-code-input'), '1234');
        fireEvent(getByTestId('approval-tier3-hold'), 'pressIn');
        act(() => { jest.advanceTimersByTime(1000); });
        unmount();
        act(() => { jest.advanceTimersByTime(5000); });
        expect(onApprove).not.toHaveBeenCalled();
    });

    test('action change clears prior hold state', () => {
        const onApprove = jest.fn();
        const { getByTestId, rerender } = render(
            <ApprovalModal
                action={tier3Action}
                onApprove={onApprove}
                onCancel={jest.fn()}
            />,
        );
        fireEvent.changeText(getByTestId('approval-security-code-input'), '1234');
        fireEvent(getByTestId('approval-tier3-hold'), 'pressIn');
        act(() => { jest.advanceTimersByTime(1000); });
        // New action arrives mid-hold
        rerender(
            <ApprovalModal
                action={{ ...tier3Action, action_id: 'a-new' }}
                onApprove={onApprove}
                onCancel={jest.fn()}
            />,
        );
        act(() => { jest.advanceTimersByTime(5000); });
        expect(onApprove).not.toHaveBeenCalled();
    });
});

describe('ApprovalModal — closed state', () => {
    test('returns null when action is null (modal closed)', () => {
        const { toJSON } = render(
            <ApprovalModal
                action={null}
                onApprove={jest.fn()}
                onCancel={jest.fn()}
            />,
        );
        expect(toJSON()).toBeNull();
    });
});
