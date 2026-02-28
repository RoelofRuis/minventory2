import { removeBackground, type Config } from '@imgly/background-removal';

self.onmessage = async (e: MessageEvent) => {
  const { file, config } = e.data;
  try {
    const blob = await removeBackground(file, config as Config);
    self.postMessage({ blob });
  } catch (error: any) {
    self.postMessage({ error: error.message || 'Background removal failed' });
  }
};
