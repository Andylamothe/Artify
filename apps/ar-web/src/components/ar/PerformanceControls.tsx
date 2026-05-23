interface Props {
  lowPower: boolean;
  setLowPower: (value: boolean) => void;
}

export function PerformanceControls({ lowPower, setLowPower }: Props) {
  return (
    <div className="performance-controls">
      <button
        type="button"
        className={`chip ${lowPower ? "chip-active" : ""}`}
        onClick={() => setLowPower(!lowPower)}
      >
        {lowPower ? "Low Power: ON" : "Low Power: OFF"}
      </button>
    </div>
  );
}
