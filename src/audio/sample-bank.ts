interface SampleManifest {
  readonly rolling: {
    readonly url: string;
  };
}

/** Owns decoded recordings used by the audio engine. */
export class SampleBank {
  readonly rolling: AudioBuffer;

  private constructor(rolling: AudioBuffer) {
    this.rolling = rolling;
  }

  static async create(context: BaseAudioContext, manifestUrl: URL): Promise<SampleBank> {
    const manifestResponse = await fetch(manifestUrl);
    if (!manifestResponse.ok) {
      throw new Error(`Failed to load sample manifest: HTTP ${manifestResponse.status}`);
    }

    const manifest = (await manifestResponse.json()) as SampleManifest;
    const baseUrl = manifestResponse.url ? new URL(manifestResponse.url) : manifestUrl;
    const recordingResponse = await fetch(new URL(manifest.rolling.url, baseUrl));
    if (!recordingResponse.ok) {
      throw new Error(`Failed to load rolling recording: HTTP ${recordingResponse.status}`);
    }

    const rolling = await context.decodeAudioData(await recordingResponse.arrayBuffer());
    return new SampleBank(rolling);
  }
}
