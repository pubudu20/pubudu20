import { registerRootComponent } from 'expo';
import { registerWidgetTaskHandler } from 'react-native-android-widget';

import App from './App';
import { widgetTaskHandler } from './src/widget/widgetTaskHandler';

// The app itself.
registerRootComponent(App);

// The home-screen widget's background handler (runs even when the app is closed).
registerWidgetTaskHandler(widgetTaskHandler);
