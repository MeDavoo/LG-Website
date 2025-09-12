import { useState, useRef } from 'react';

export interface WheelSegment {
  id: string;
  label: string;
  color: string;
  data?: any; // Additional data for the segment
}

interface SpinningWheelProps {
  segments: WheelSegment[];
  onSpin: (result: WheelSegment) => void;
  size?: number;
  disabled?: boolean;
}

const SpinningWheel = ({ segments, onSpin, size = 300, disabled = false }: SpinningWheelProps) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<WheelSegment | null>(null);
  const [currentCycleIndex, setCurrentCycleIndex] = useState(0);
  const wheelRef = useRef<SVGSVGElement>(null);

  const handleSpin = () => {
    if (isSpinning || disabled || segments.length === 0) return;

    setIsSpinning(true);
    setResult(null);

    // For large segment counts, use text cycling instead of wheel
    if (segments.length > 20) {
      // Text cycling animation
      const cycleDuration = 2000; // 2 seconds of cycling
      const cycleSpeed = 100; // Change text every 100ms
      const cycles = cycleDuration / cycleSpeed;
      
      let cycleCount = 0;
      const cycleInterval = setInterval(() => {
        setCurrentCycleIndex((prev) => (prev + 1) % segments.length);
        cycleCount++;
        
        if (cycleCount >= cycles) {
          clearInterval(cycleInterval);
          // Select final random result
          const randomIndex = Math.floor(Math.random() * segments.length);
          const selectedSegment = segments[randomIndex];
          setCurrentCycleIndex(randomIndex);
          setResult(selectedSegment);
          setIsSpinning(false);
          
          if (onSpin) {
            onSpin(selectedSegment);
          }
        }
      }, cycleSpeed);
      
      return;
    }

    // Normal wheel spin logic for smaller segment counts
    const minSpins = 3;
    const maxSpins = 6;
    const spins = Math.random() * (maxSpins - minSpins) + minSpins;
    const finalRotation = rotation + (spins * 360);
    
    setRotation(finalRotation);

    // Calculate which segment the wheel landed on
    setTimeout(() => {
      const normalizedRotation = finalRotation % 360;
      const segmentAngle = 360 / segments.length;
      
      // Pointer is at 0 degrees (3 o'clock), wheel rotates clockwise
      // After rotation, we need to find which segment is at the pointer position
      // Since the wheel moved clockwise by normalizedRotation degrees,
      // the segment that was originally at -normalizedRotation is now at the pointer
      let pointerAngle = (360 - normalizedRotation) % 360;
      
      // Find which segment this angle falls into
      const segmentIndex = Math.floor(pointerAngle / segmentAngle) % segments.length;
      const selectedSegment = segments[segmentIndex];
      
      console.log('Debug:', { 
        finalRotation, 
        normalizedRotation, 
        pointerAngle, 
        segmentAngle, 
        segmentIndex, 
        selectedLabel: selectedSegment.label 
      });
      
      setResult(selectedSegment);
      setIsSpinning(false);
      
      if (onSpin) {
        onSpin(selectedSegment);
      }
    }, 3000); // Match animation duration
  };

  const segmentAngle = 360 / segments.length;
  const radius = size / 2 - 20;
  const centerX = size / 2;
  const centerY = size / 2;

  // Create wheel segments
  const createSegmentPath = (index: number) => {
    // Start from right side (3 o'clock position) - this is the default 0 degrees in SVG
    const startAngle = (index * segmentAngle) * (Math.PI / 180);
    const endAngle = ((index + 1) * segmentAngle) * (Math.PI / 180);
    
    const x1 = centerX + radius * Math.cos(startAngle);
    const y1 = centerY + radius * Math.sin(startAngle);
    const x2 = centerX + radius * Math.cos(endAngle);
    const y2 = centerY + radius * Math.sin(endAngle);
    
    const largeArcFlag = segmentAngle > 180 ? 1 : 0;
    
    return `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
  };

  // Calculate text position
  const getTextPosition = (index: number) => {
    // Start from right side (3 o'clock position)
    const angle = (index * segmentAngle + segmentAngle / 2) * (Math.PI / 180);
    const textRadius = radius * 0.7;
    const x = centerX + textRadius * Math.cos(angle);
    const y = centerY + textRadius * Math.sin(angle);
    
    return { x, y, angle: angle * (180 / Math.PI) };
  };

  return (
    <div className="flex flex-col items-center space-y-6">
      {/* Large segment count: Text cycling display */}
      {segments.length > 20 ? (
        <div className="text-center">
          <div className="bg-white/20 backdrop-blur-md rounded-xl p-8 border border-white/30 min-h-[200px] flex items-center justify-center">
            <div className="text-white">
              <div className="text-sm text-white/70 mb-2">
                {isSpinning ? 'Cycling through options...' : 'Ready to spin!'}
              </div>
              <div className="text-3xl font-bold mb-2">
                {isSpinning || result ? 
                  (isSpinning ? segments[currentCycleIndex]?.label : result?.label) : 
                  'Press SPIN!'
                }
              </div>
              <div className="text-sm text-white/60">
                {segments.length} total options
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Small segment count: Normal wheel display */
        <div className="relative">
          {/* Pointer - longer, stretched, pointing INTO the wheel with only tip inside */}
          <div className="absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
            <div className="w-0 h-0 border-t-6 border-b-6 border-r-16 border-t-transparent border-b-transparent border-r-red-500 drop-shadow-lg"
                 style={{ borderRightWidth: '48px', borderTopWidth: '10px', borderBottomWidth: '10px' }}></div>
          </div>
          
          {/* Wheel */}
          <svg
            ref={wheelRef}
            width={size}
            height={size}
            className="drop-shadow-lg"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: isSpinning ? 'transform 3s cubic-bezier(0.2, 0.8, 0.2, 1)' : 'none'
            }}
          >
            {/* Wheel segments */}
            {segments.map((segment, index) => (
              <g key={segment.id}>
                <path
                  d={createSegmentPath(index)}
                  fill={segment.color}
                  stroke="#333"
                  strokeWidth="2"
                  className="hover:brightness-110 transition-all duration-200"
                />
                
                {/* Text */}
                <text
                  x={getTextPosition(index).x}
                  y={getTextPosition(index).y}
                  fill="white"
                  fontSize={Math.max(12, size / 25)}
                  fontWeight="bold"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  transform={`rotate(${getTextPosition(index).angle}, ${getTextPosition(index).x}, ${getTextPosition(index).y})`}
                  className="pointer-events-none select-none drop-shadow-sm"
                >
                  {segment.label.length > 10 ? segment.label.substring(0, 10) + '...' : segment.label}
                </text>
              </g>
            ))}
            
            {/* Center circle */}
            <circle
              cx={centerX}
              cy={centerY}
              r="15"
              fill="#333"
              stroke="#fff"
              strokeWidth="3"
            />
          </svg>
        </div>
      )}

      {/* Spin Button */}
      <button
        onClick={handleSpin}
        disabled={isSpinning || disabled || segments.length === 0}
        className={`px-6 py-3 rounded-lg font-bold text-lg transition-all duration-200 ${
          isSpinning || disabled || segments.length === 0
            ? 'bg-gray-500 text-gray-300 cursor-not-allowed'
            : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 transform hover:scale-105 active:scale-95'
        }`}
      >
        {isSpinning ? 'Spinning...' : 'SPIN!'}
      </button>

      {/* Segments Info */}
      {segments.length === 0 && (
        <div className="text-white/60 text-center">
          <p>No segments available for this wheel</p>
        </div>
      )}
    </div>
  );
};

export default SpinningWheel;