import type React from "react";

interface PopupButtonProps {
  label: string | undefined;
  Icon: React.ElementType;
  onClick: () => void;
  isVertical?: boolean;
}

const PopupButton: React.FC<PopupButtonProps> = ({ label, Icon, onClick, isVertical = false }) => {
  const handleClick = () => {
    onClick();
  };

  return (
    <div className="flex items-center justify-center">
      <button
        onClick={handleClick}
        className={`flex cursor-pointer items-center justify-center gap-1 rounded p-0 transition-colors duration-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 ${
          isVertical ? "h-auto w-6 flex-col px-0 py-1" : "h-6 min-w-6 px-1"
        }`}
      >
        <Icon size={16} />
        {label && <span className="text-sm">{label}</span>}
      </button>
    </div>
  );
};

export default PopupButton;
