import { readFile } from "fs/promises";
import { join } from "path";
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const filename = searchParams.get('filename');

    if (!filename) {
      return NextResponse.json({ error: "Filename is required" }, { status: 400 });
    }

    // Validate filename to prevent directory traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
    }

    const filePath = join('D:\\attendanceImage', filename);
    
    try {
      const imageBuffer = await readFile(filePath);
      
      // Determine content type based on file extension
      const ext = filename.split('.').pop().toLowerCase();
      let contentType = 'image/jpeg';
      
      switch (ext) {
        case 'png':
          contentType = 'image/png';
          break;
        case 'jpg':
        case 'jpeg':
          contentType = 'image/jpeg';
          break;
        case 'gif':
          contentType = 'image/gif';
          break;
        case 'webp':
          contentType = 'image/webp';
          break;
        default:
          contentType = 'image/jpeg';
      }

      return new Response(imageBuffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
        },
      });
    } catch (fileError) {
      console.error('File not found:', filePath);
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }
  } catch (error) {
    console.error('Error serving image:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
