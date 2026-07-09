import { Categories, type CategoryConfig } from 'emoji-picker-react';

/** Danh mục emoji tiếng Việt, thứ tự giống Threads. */
export const THREADS_EMOJI_CATEGORIES: CategoryConfig[] = [
  { category: Categories.SMILEYS_PEOPLE, name: 'Mặt cười và người' },
  { category: Categories.ANIMALS_NATURE, name: 'Động vật và thiên nhiên' },
  { category: Categories.FOOD_DRINK, name: 'Ẩm thực' },
  { category: Categories.ACTIVITIES, name: 'Hoạt động' },
  { category: Categories.TRAVEL_PLACES, name: 'Du lịch' },
  { category: Categories.OBJECTS, name: 'Đồ vật' },
  { category: Categories.SYMBOLS, name: 'Biểu tượng' },
  { category: Categories.FLAGS, name: 'Cờ' },
];
