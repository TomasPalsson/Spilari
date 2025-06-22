import React from "react";
import { FaVideo } from "react-icons/fa";

interface FileCardProps {
  file: { Key: string; publicUrl?: string };
  bucket: string;
  onVideoPlay: (url: string, item: any) => void;
}

const FileCard: React.FC<FileCardProps> = ({ file, bucket, onVideoPlay }) => {
    if (!file.Key) return null;
    const url = file.publicUrl || (bucket ? `https://${bucket}.s3.eu-west-1.amazonaws.com/${file.Key}` : '');
    const fileName = file.Key.split("/").pop();
    const isVideo = (fileName ?? '').toLowerCase().endsWith('.m3u8') || (fileName ?? '').toLowerCase().endsWith('.mp4');

    const handleCardClick = () => {
        if (isVideo && url) onVideoPlay(url, file);
    };

    return (
        <div
            className={`flex flex-col max-w-3xl border border-gray-700 rounded-2xl shadow-xl p-6 my-6 transition-transform hover:scale-[1.02] cursor-pointer ${isVideo ? '' : 'pointer-events-none'}`}
            onClick={handleCardClick}
            tabIndex={0}
            role={isVideo ? "button" : undefined}
        >
            <div className="flex items-center gap-4 mb-4">
                <div className="flex-shrink-0 bg-gray-800 rounded-full p-3">
                    <FaVideo className="text-blue-400 w-8 h-8" />
                </div>
                <div>
                    <p
                        className="text-gray-100 font-semibold text-xl"
                    >
                        {file.Key.split('/')[0] || 'Unknown File'}
                    </p>
                    <div className="text-xs text-gray-400 mt-1 break-all">
                        {file.Key}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FileCard;
