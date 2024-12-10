// utils/getDefaultPlaySettings.ts
import { BITRATES } from "@/components/BitrateSelector";
import {
  BaseItemDto,
  MediaSourceInfo,
} from "@jellyfin/sdk/lib/generated-client";
import { Settings } from "../atoms/settings";

interface PlaySettings {
  item: BaseItemDto;
  bitrate: (typeof BITRATES)[0];
  mediaSource?: MediaSourceInfo | null;
  audioIndex?: number | undefined;
  subtitleIndex?: number | undefined;
}

export function getDefaultPlaySettings(
  item: BaseItemDto,
  settings: Settings
): PlaySettings {
  if (item.Type === "Program") {
    return {
      item,
      bitrate: BITRATES[0],
      mediaSource: undefined,
      audioIndex: undefined,
      subtitleIndex: undefined,
    };
  }

  // 1. Get first media source

  const mediaSource = item.MediaSources?.[0];

  // 2. Get default or preferred audio
  const defaultAudioIndex = mediaSource?.DefaultAudioStreamIndex;
  const preferedAudioIndex = mediaSource?.MediaStreams?.find(
    (x) => x.Type === "Audio" && x.Language === settings?.defaultAudioLanguage
  )?.Index;
  const firstAudioIndex = mediaSource?.MediaStreams?.find(
    (x) => x.Type === "Audio"
  )?.Index;

  // TODO: Need to most common next subtitle index as an option.
  const finalSubtitleIndex = mediaSource?.DefaultAudioStreamIndex;

  // 4. Get default bitrate
  const bitrate = BITRATES.sort(
    (a, b) => (b.value || Infinity) - (a.value || Infinity)
  )[0];

  return {
    item,
    bitrate,
    mediaSource,
    audioIndex: preferedAudioIndex ?? defaultAudioIndex ?? firstAudioIndex,
    subtitleIndex: finalSubtitleIndex || -1,
  };
}
