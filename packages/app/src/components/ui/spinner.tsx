import clsx from "clsx";
import type React from "react";

const Spinner: React.FC<{
  loading: boolean;
}> = ({ loading }) => {
  if (!loading) return null;

  return (
    <div
      className={clsx(
        "-translate-x-1/2 absolute left-1/2 transform text-center",
        "top-4 pt-[calc(env(safe-area-inset-top)+64px)]",
      )}
      role="status"
    >
      <span className="loading loading-dots loading-lg" />
      <span className="hidden">加载中...</span>
    </div>
  );
};

export default Spinner;
