import React from 'react';

const ProfileSkeleton: React.FC = () => {
  return (
    <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6 animate-pulse">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between pb-6 mb-6">
        <div className="flex flex-col items-center w-full gap-6 xl:flex-row">
          <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700"></div>
          <div className="order-3 xl:order-2">
            <div className="h-6 w-48 rounded bg-gray-200 dark:bg-gray-700"></div>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="h-10 w-24 rounded-lg bg-gray-200 dark:bg-gray-700"></div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-y-6 sm:grid-cols-2 lg:grid-cols-2 lg:gap-x-6">
        <div>
          <div className="mb-2 h-4 w-20 rounded bg-gray-200 dark:bg-gray-700"></div>
          <div className="h-5 w-32 rounded bg-gray-200 dark:bg-gray-700"></div>
        </div>
        <div>
          <div className="mb-2 h-4 w-20 rounded bg-gray-200 dark:bg-gray-700"></div>
          <div className="h-5 w-32 rounded bg-gray-200 dark:bg-gray-700"></div>
        </div>
        <div>
          <div className="mb-2 h-4 w-24 rounded bg-gray-200 dark:bg-gray-700"></div>
          <div className="h-5 w-48 rounded bg-gray-200 dark:bg-gray-700"></div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSkeleton;
