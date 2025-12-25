import React, { useCallback } from 'react';
import { Box } from '@mui/material';
import {
  useDropzone,
  DropzoneRootProps,
  DropzoneInputProps,
} from 'react-dropzone';
import Compressor from 'compressorjs';
import { fileToBase64 } from '../utils/base64';

type Mode = 'single' | 'multi';

interface ImageResult {
  base64: string;
  name: string;
  type: string;
  size: number;
}

interface CommonProps {
  children: React.ReactNode;
  mode?: Mode;
  quality?: number;
  maxWidth?: number;
}

interface SingleModeProps extends CommonProps {
  mode?: 'single';
  onPick: (result: ImageResult) => void;
}

interface MultiModeProps extends CommonProps {
  mode: 'multi';
  onPick: (results: ImageResult[]) => void;
}

type ImageUploaderProps = SingleModeProps | MultiModeProps;

export const ImagePicker: React.FC<ImageUploaderProps> = ({
  children,
  onPick,
  quality = 0.6,
  maxWidth = 1200,
  mode = 'single',
}) => {
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const images =
        mode === 'single' ? acceptedFiles.slice(0, 1) : acceptedFiles;

      const results: ImageResult[] = [];

      for (const image of images) {
        try {
          let fileToConvert: Blob;

          if (image.type === 'image/gif') {
            if (image.size > 500 * 1024) {
              console.error('GIF file size exceeds 500KB limit.');
              continue;
            }
            fileToConvert = image;
          } else {
            fileToConvert = await new Promise<Blob>((resolve, reject) => {
              new Compressor(image, {
                quality,
                maxWidth,
                mimeType: 'image/webp',
                success(result) {
                  resolve(result);
                },
                error(err) {
                  console.error('Compression error:', err);
                  reject(err);
                },
              });
            }).catch(() => image); // fallback to original if compression fails
          }

          const base64 = await fileToBase64(fileToConvert);

          results.push({
            base64,
            name: image.name,
            type: image.type,
            size: image.size,
          });
        } catch (error) {
          console.error('File processing error:', error);
        }
      }

      if (mode === 'single') {
        if (results[0]) {
          (onPick as (result: ImageResult) => void)(results[0]);
        }
      } else {
        (onPick as (results: ImageResult[]) => void)(results);
      }
    },
    [onPick, mode, quality, maxWidth]
  );

  const {
    getRootProps,
    getInputProps,
  }: {
    getRootProps: () => DropzoneRootProps;
    getInputProps: () => DropzoneInputProps;
    isDragActive: boolean;
  } = useDropzone({
    onDrop,
    accept: {
      'image/*': [],
    },
  });

  return (
    <Box {...getRootProps()} sx={{ display: 'flex' }}>
      <input {...getInputProps()} />
      {children}
    </Box>
  );
};
