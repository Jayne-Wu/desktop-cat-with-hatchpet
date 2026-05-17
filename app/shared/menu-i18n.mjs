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
    behavior: "行为",
    still: "原地待着",
    bottomWalk: "沿底部走动",
    dockLeft: "停靠左侧",
    dockRight: "停靠右侧",
    interaction: "交互",
    clickThrough: "点击穿透",
    pin: "置顶",
    unpin: "取消置顶",
    position: "位置",
    center: "回到屏幕中央",
    bottomRight: "回到右下角",
    actionTest: "动作测试",
    idle: "待机",
    waving: "挥手",
    jumping: "跳跃",
    waiting: "等待",
    running: "工作中",
    review: "审查",
    failed: "失败",
    runningLeft: "向左移动",
    runningRight: "向右移动",
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
    behavior: "Behavior",
    still: "Stay Still",
    bottomWalk: "Walk Along Bottom",
    dockLeft: "Dock Left",
    dockRight: "Dock Right",
    interaction: "Interaction",
    clickThrough: "Click Through",
    pin: "Pin",
    unpin: "Unpin",
    position: "Position",
    center: "Move to Center",
    bottomRight: "Move to Bottom Right",
    actionTest: "Action Test",
    idle: "Idle",
    waving: "Wave",
    jumping: "Jump",
    waiting: "Waiting",
    running: "Working",
    review: "Review",
    failed: "Failed",
    runningLeft: "Move Left",
    runningRight: "Move Right",
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
