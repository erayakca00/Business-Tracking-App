/**
 * @format
 */

import 'react-native-reanimated';
import { AppRegistry, LogBox } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

// Aggressively suppress the warning by overriding console.warn
const originalWarn = console.warn;
console.warn = (...args) => {
    const msg = args.join(' ');
    if (msg.includes('Remote debugger') || msg.includes('Debugger')) {
        return;
    }
    originalWarn(...args);
};

LogBox.ignoreLogs([
    'Remote debugger',
    'Debugger',
    'Warning: Remote debugger',
    'Remote debugger is in a background tab'
]);

AppRegistry.registerComponent(appName, () => App);
