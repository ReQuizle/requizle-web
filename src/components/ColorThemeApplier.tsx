import {useEffect} from 'react';
import {useTheme} from '../context/ThemeContext';
import {useQuizStore} from '../store/useQuizStore';
import {applyDocumentTheme} from '../utils/colorThemes';

export const ColorThemeApplier: React.FC = () => {
    const {theme} = useTheme();
    const colorTheme = useQuizStore(s => s.settings.colorTheme);
    const customAccentColor = useQuizStore(s => s.settings.customAccentColor);

    useEffect(() => {
        applyDocumentTheme({colorTheme, customAccentColor, appearanceMode: theme});
    }, [colorTheme, customAccentColor, theme]);

    return null;
};
