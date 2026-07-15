interface Props {
  options: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

/** 시안의 다크 캡슐 토글 (지도 뷰 ↔ 카메라 뷰) */
export default function SegmentPill({ options, selectedIndex, onSelect }: Props) {
  return (
    <div className="segment-pill">
      {options.map((label, i) => (
        <button
          key={label}
          className={i === selectedIndex ? 'active' : ''}
          onClick={() => onSelect(i)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
