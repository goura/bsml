// Preload script: registers happy-dom globals (document, window, etc.) before tests run
import { GlobalRegistrator } from '@happy-dom/global-registrator';
GlobalRegistrator.register();
