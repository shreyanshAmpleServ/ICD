import { Request, Response } from "express";
import { uploadFile } from "../../utils/blackbaze";
import prisma from "../../configs/prisma.client";

export const uploadImageController = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "File is required" });
    }
    const fileName = `uploads/${Date.now()}-${req.file.originalname}`;
    const publicUrl = await uploadFile(
      req.file.buffer,
      fileName,
      req.file.mimetype,
    );
    let savedRecord: any = null;
    if ((prisma as any).asset_images) {
      savedRecord = await (prisma as any).asset_images.create({
        data: {
          image_url: publicUrl,
          uploaded_at: new Date(),
        },
      });
    } else {
      savedRecord = {
        image_url: publicUrl,
        file_name: fileName,
        original_name: req.file.originalname,
        mime_type: req.file.mimetype,
        size: req.file.size,
        uploaded_at: new Date(),
      };
    }
    return res.status(201).json({
      success: true,
      data: savedRecord,
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

export default uploadImageController;
