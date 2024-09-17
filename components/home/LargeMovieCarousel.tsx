import { apiAtom, userAtom } from "@/providers/JellyfinProvider";
import { useSettings } from "@/utils/atoms/settings";
import { getBackdropUrl } from "@/utils/jellyfin/image/getBackdropUrl";
import { getLogoImageUrlById } from "@/utils/jellyfin/image/getLogoImageUrlById";
import { BaseItemDto } from "@jellyfin/sdk/lib/generated-client/models";
import { getItemsApi } from "@jellyfin/sdk/lib/utils/api";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useAtom } from "jotai";
import React, { useCallback, useMemo } from "react";
import { Dimensions, TouchableOpacity, View, ViewProps } from "react-native";
import Animated, {
  runOnJS,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Carousel, {
  ICarouselInstance,
  Pagination,
} from "react-native-reanimated-carousel";
import { itemRouter, TouchableItemRouter } from "../common/TouchableItemRouter";
import { Loader } from "../Loader";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useRouter, useSegments } from "expo-router";
import * as Haptics from "expo-haptics";

interface Props extends ViewProps {}

export const LargeMovieCarousel: React.FC<Props> = ({ ...props }) => {
  const [settings] = useSettings();

  const ref = React.useRef<ICarouselInstance>(null);
  const progress = useSharedValue<number>(0);

  const [api] = useAtom(apiAtom);
  const [user] = useAtom(userAtom);

  const { data: sf_carousel, isFetching: l1 } = useQuery({
    queryKey: ["sf_carousel", user?.Id, settings?.mediaListCollectionIds],
    queryFn: async () => {
      if (!api || !user?.Id) return null;

      const response = await getItemsApi(api).getItems({
        userId: user.Id,
        tags: ["sf_carousel"],
        recursive: true,
        fields: ["Tags"],
        includeItemTypes: ["BoxSet"],
      });

      return response.data.Items?.[0].Id || null;
    },
    enabled: !!api && !!user?.Id && settings?.usePopularPlugin === true,
    staleTime: 60 * 1000,
  });

  const onPressPagination = (index: number) => {
    ref.current?.scrollTo({
      /**
       * Calculate the difference between the current index and the target index
       * to ensure that the carousel scrolls to the nearest index
       */
      count: index - progress.value,
      animated: true,
    });
  };

  const { data: popularItems, isFetching: l2 } = useQuery<BaseItemDto[]>({
    queryKey: ["popular", user?.Id],
    queryFn: async () => {
      if (!api || !user?.Id || !sf_carousel) return [];

      const response = await getItemsApi(api).getItems({
        userId: user.Id,
        parentId: sf_carousel,
        limit: 10,
      });

      return response.data.Items || [];
    },
    enabled: !!api && !!user?.Id && !!sf_carousel,
    staleTime: 60 * 1000,
  });

  const width = Dimensions.get("screen").width;

  if (l1 || l2)
    return (
      <View className="h-[242px] flex items-center justify-center">
        <Loader />
      </View>
    );

  if (!popularItems) return null;

  return (
    <View className="flex flex-col items-center" {...props}>
      <Carousel
        autoPlay={true}
        autoPlayInterval={3000}
        loop={true}
        ref={ref}
        width={width}
        height={204}
        data={popularItems}
        onProgressChange={progress}
        renderItem={({ item, index }) => <RenderItem item={item} />}
      />
      <Pagination.Basic
        progress={progress}
        data={popularItems}
        dotStyle={{
          backgroundColor: "rgba(255,255,255,0.2)",
          borderRadius: 50,
        }}
        activeDotStyle={{
          backgroundColor: "rgba(255,255,255,0.8)",
          borderRadius: 50,
        }}
        containerStyle={{ gap: 5, marginTop: 12 }}
        onPress={onPressPagination}
      />
    </View>
  );
};

const RenderItem: React.FC<{ item: BaseItemDto }> = ({ item }) => {
  const [api] = useAtom(apiAtom);
  const router = useRouter();
  const screenWidth = Dimensions.get("screen").width;

  const uri = useMemo(() => {
    if (!api) return null;

    return getBackdropUrl({
      api,
      item,
      quality: 70,
      width: Math.floor(screenWidth * 0.8 * 2),
    });
  }, [api, item]);

  const logoUri = useMemo(() => {
    if (!api) return null;
    return getLogoImageUrlById({ api, item, height: 100 });
  }, [item]);

  const segments = useSegments();
  const from = segments[2];

  const opacity = useSharedValue(1);

  const handleRoute = useCallback(() => {
    if (!from) return;
    const url = itemRouter(item, from);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // @ts-ignore
    if (url) router.push(url);
  }, [item, from]);

  const tap = Gesture.Tap()
    .maxDuration(2000)
    .onBegin(() => {
      opacity.value = withTiming(0.5, { duration: 100 });
    })
    .onEnd(() => {
      runOnJS(handleRoute)();
    })
    .onFinalize(() => {
      opacity.value = withTiming(1, { duration: 100 });
    });

  if (!uri || !logoUri) return null;

  return (
    <GestureDetector gesture={tap}>
      <Animated.View
        style={{
          opacity: opacity,
        }}
        className="px-4"
      >
        <View className="relative flex justify-center rounded-2xl overflow-hidden border border-neutral-800">
          <Image
            source={{
              uri,
            }}
            style={{
              width: "100%",
              height: 200,
              borderRadius: 16,
              overflow: "hidden",
            }}
          />
          <View className="absolute bottom-0 left-0 w-full h-24 p-4 flex items-center">
            <Image
              source={{
                uri: logoUri,
              }}
              style={{
                width: "100%",
                height: "100%",
                resizeMode: "contain",
              }}
            />
          </View>
        </View>
      </Animated.View>
    </GestureDetector>
  );
};
