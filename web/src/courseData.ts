import { DEMO_ROUTE } from './config';

export interface RecommendedCourse {
  id: string;
  title: string;
  area: string;
  photo: string;
  distance: string;
  duration: string;
  description: string;
  tags: string[];
  route: [number, number][];
}

export const RECOMMENDED_COURSES: RecommendedCourse[] = [
  {
    id: 'seokchon-lake',
    title: '석촌 호수',
    area: '서울 송파구',
    photo: '/assets/course-seokchon.png',
    distance: '2km',
    duration: '35분',
    description: '호수를 따라 걷는 평탄한 순환 코스로, 콩이와 가볍게 산책하기 좋아요.',
    tags: ['평탄한 산책로', '호수 풍경', '반려견 추천'],
    route: DEMO_ROUTE,
  },
  {
    id: 'ogeum-park',
    title: '오금 공원',
    area: '서울 송파구',
    photo: '/assets/course-ogeum.png',
    distance: '1.3km',
    duration: '24분',
    description: '나무 데크와 숲길이 이어지는 조용한 공원 코스로, 붐비지 않아 여유롭게 걸을 수 있어요.',
    tags: ['숲길 산책', '조용한 코스', '나무 데크'],
    route: [
      [37.50595, 127.13065], [37.50618, 127.13102], [37.50646, 127.13134],
      [37.50675, 127.13158], [37.50702, 127.1319], [37.50712, 127.13232],
      [37.50696, 127.13269], [37.50664, 127.13288], [37.50631, 127.13276],
      [37.50605, 127.13243], [37.50586, 127.13206], [37.50576, 127.13162],
      [37.50582, 127.13112], [37.50595, 127.13065],
    ],
  },
];

export function findRecommendedCourse(id: string | null): RecommendedCourse | undefined {
  return RECOMMENDED_COURSES.find((course) => course.id === id);
}
