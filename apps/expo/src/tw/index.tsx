import { useCssElement, useNativeVariable as useFunctionalVariable } from "react-native-css"
import type React from "react"
import {
  View as RNView,
  Text as RNText,
  Pressable as RNPressable,
  ScrollView as RNScrollView,
  TextInput as RNTextInput,
  FlatList as RNFlatList,
} from "react-native"

export const useCSSVariable =
  process.env.EXPO_OS !== "web" ? useFunctionalVariable : (variable: string) => `var(${variable})`

export type ViewProps = React.ComponentProps<typeof RNView> & { className?: string }
export const View = (props: ViewProps) => useCssElement(RNView, props, { className: "style" })
View.displayName = "CSS(View)"

export const Text = (props: React.ComponentProps<typeof RNText> & { className?: string }) =>
  useCssElement(RNText, props, { className: "style" })
Text.displayName = "CSS(Text)"

export const ScrollView = (
  props: React.ComponentProps<typeof RNScrollView> & {
    className?: string
    contentContainerClassName?: string
  },
) =>
  useCssElement(RNScrollView, props, {
    className: "style",
    contentContainerClassName: "contentContainerStyle",
  })
ScrollView.displayName = "CSS(ScrollView)"

export const Pressable = (
  props: React.ComponentProps<typeof RNPressable> & { className?: string },
) => useCssElement(RNPressable, props, { className: "style" })
Pressable.displayName = "CSS(Pressable)"

export const TextInput = (
  props: React.ComponentProps<typeof RNTextInput> & { className?: string },
) => useCssElement(RNTextInput, props, { className: "style" })
TextInput.displayName = "CSS(TextInput)"

export const FlatList = <ItemT,>(
  props: React.ComponentProps<typeof RNFlatList<ItemT>> & {
    className?: string
    contentContainerClassName?: string
  },
) =>
  useCssElement(
    RNFlatList as React.ComponentType<React.ComponentProps<typeof RNFlatList<ItemT>>>,
    props,
    {
      className: "style",
      contentContainerClassName: "contentContainerStyle",
    },
  )
