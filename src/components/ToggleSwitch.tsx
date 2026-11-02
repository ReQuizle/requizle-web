import React from 'react';

type ToggleSwitchProps = {
    checked: boolean;
    onChange: (checked: boolean) => void;
};

/** A checkbox drawn as a switch. Place it inside the label that names it. */
export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({checked, onChange}) => (
    <span className="relative flex items-center shrink-0">
        <input
            type="checkbox"
            className="toggle-switch-input"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
        />
        <span className="toggle-switch-track" />
    </span>
);
