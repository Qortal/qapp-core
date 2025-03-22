import React, { useCallback } from "react";
import { Box } from "@mui/material";
import {
  useDropzone,
  DropzoneRootProps,
  DropzoneInputProps,
} from "react-dropzone";
import Compressor from "compressorjs";
import { fileToBase64 } from "../utils/base64";

type Mode = "single" | "multi";

interface CommonProps {
  children: React.ReactNode;
  mode?: Mode;
}

interface SingleModeProps extends CommonProps {
  mode?: "single";
  onPick: (base64: string) => void;
}

interface MultiModeProps extends CommonProps {
  mode: "multi";
  onPick: (base64s: string[]) => void;
}

type ImageUploaderProps = SingleModeProps | MultiModeProps;

export const ImagePicker: React.FC<ImageUploaderProps> = ({
  children,
  onPick,
  mode = "single",
}) => {
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const images =
        mode === "single" ? acceptedFiles.slice(0, 1) : acceptedFiles;

      const base64s: string[] = [];

      for (const image of images) {
        try {
          let fileToConvert: File;

          if (image.type === "image/gif") {
            if (image.size > 500 * 1024) {
              console.error("GIF file size exceeds 500KB limit.");
              continue;
            }
            fileToConvert = image;
          } else {
            fileToConvert = await new Promise<File>((resolve, reject) => {
              new Compressor(image, {
                quality: 0.6,
                maxWidth: 1200,
                mimeType: "image/webp",
                success(result) {
                  resolve(
                    new File([result], image.name, { type: "image/webp" })
                  );
                },
                error(err) {
                  console.error("Compression error:", err);
                  reject(err);
                },
              });
            }).catch(() => image); // fallback to original if compression fails
          }

          const base64 = await fileToBase64(fileToConvert);
          base64s.push(base64);
        } catch (error) {
          console.error("File processing error:", error);
        }
      }

      if (mode === "single") {
        if (base64s[0]) {
          (onPick as (base64: string) => void)(base64s[0]);
        }
      } else {
        (onPick as (base64s: string[]) => void)(base64s);
      }
    },
    [onPick, mode]
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
      "image/*": [],
    },
  });

  return (
    <Box {...getRootProps()} sx={{ display: "flex" }}>
      <input {...getInputProps()} />
      {children}
    </Box>
  );
};
