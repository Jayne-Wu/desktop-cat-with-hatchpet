export const LANGUAGE_OPTIONS = [
  { id: "zh-CN", label: "中文" },
  { id: "en-US", label: "English" }
];

export const DEFAULT_LANGUAGE = "zh-CN";

const TEXT = {
  "zh-CN": {
    currentPet: "当前宠物",
    petUnavailable: "宠物不可用",
    noPetsFound: "没有找到宠物",
    pet: "宠物",
    appearance: "外观",
    size: "尺寸",
    small: "小",
    medium: "中",
    large: "大",
    companion: "陪伴风格",
    quiet: "安静陪伴",
    curious: "好奇巡视",
    playful: "活泼玩耍",
    focus: "低打扰专注",
    interaction: "交互",
    clickThrough: "点击穿透",
    position: "位置",
    center: "回到屏幕中央",
    bottomRight: "回到右下角",
    language: "语言",
    show: "显示",
    hide: "隐藏",
    quit: "退出"
  },
  "en-US": {
    currentPet: "Current Pet",
    petUnavailable: "Pet unavailable",
    noPetsFound: "No pets found",
    pet: "Pet",
    appearance: "Appearance",
    size: "Size",
    small: "Small",
    medium: "Medium",
    large: "Large",
    companion: "Companion Style",
    quiet: "Quiet",
    curious: "Curious",
    playful: "Playful",
    focus: "Focus",
    interaction: "Interaction",
    clickThrough: "Click Through",
    position: "Position",
    center: "Move to Center",
    bottomRight: "Move to Bottom Right",
    language: "Language",
    show: "Show",
    hide: "Hide",
    quit: "Quit"
  }
};

export function normalizeLanguage(language) {
  return LANGUAGE_OPTIONS.some((option) => option.id === language) ? language : DEFAULT_LANGUAGE;
}

export function getMenuText(language) {
  return TEXT[normalizeLanguage(language)];
}
