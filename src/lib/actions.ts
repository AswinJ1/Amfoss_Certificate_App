"use server"

import { promises as fs } from "fs"
import path from "path"
import { z } from "zod"
import { PDFDocument, rgb } from 'pdf-lib'
import * as XLSX from "xlsx"
import fontkit from '@pdf-lib/fontkit'
import { prisma } from './prisma'

// Cache for participants data
let participantsCache: any[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function getParticipants(): Promise<any[]> {
  const now = Date.now();
  
  // Return cached data if still valid
  if (participantsCache && (now - cacheTimestamp) < CACHE_DURATION) {
    console.log("Using cached participants data");
    return participantsCache;
  }
  
  // Load fresh data
  console.log("Loading participants from Excel");
  const filePath = path.resolve(process.cwd(), "data", "students.xlsx");
  const fileBuffer = await fs.readFile(filePath);
  const workbook = XLSX.read(fileBuffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  participantsCache = XLSX.utils.sheet_to_json(sheet);
  cacheTimestamp = now;
  
  return participantsCache;
}

const formSchema = z.object({
  name: z.string().min(1, "Full name is required"),
  rollno: z.string().min(1, "Roll number is required"),
  email: z.string().email("Invalid email address"),

})

type ActionResponse = {
  success: boolean
  message?: string
  data?: string
}

export async function verifyAndGenerateCertificate(data: {
  name: string;
  rollno: string;
  email: string;
}): Promise<ActionResponse> {
  try {
    console.log("Verifying participant:", data);

    // Remove redundant file access checks - only check once
    const templatePath = path.resolve(process.cwd(), "public", "certificate-template.pdf");
    const fontPath = path.resolve(process.cwd(), 'public', 'fonts', 'Acumin-RPro.otf');

    // Verify participant using cached data
    const isValidParticipant = await verifyParticipant(
      data.name,
      data.rollno,  
      data.email
    );
    
    if (!isValidParticipant) {
      return {
        success: false,
        message: "Participant details not found in registered participants list"
      };
    }

    // Read and modify PDF
    const [templateBytes, fontBytes] = await Promise.all([
      fs.readFile(templatePath),
      fs.readFile(fontPath)
    ]);

    const pdfDoc = await PDFDocument.load(templateBytes);
    pdfDoc.registerFontkit(fontkit);
    const font = await pdfDoc.embedFont(fontBytes);
    const page = pdfDoc.getPages()[0];
    const { width, height } = page.getSize();
    
    // Proper case formatting for the name
    const formatName = (name: string) => {
      return name
        .trim()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    };
    
    const formattedName = formatName(data.name);
    
    // Dynamic font size calculation
    const maxNameWidth = width * 0.7;
    let nameFontSize = 45;
    let nameWidth = font.widthOfTextAtSize(formattedName, nameFontSize);
    
    while (nameWidth > maxNameWidth && nameFontSize > 20) {
      nameFontSize -= 1;
      nameWidth = font.widthOfTextAtSize(formattedName, nameFontSize);
    }
    
    const nameConfig = {
      text: formattedName,
      fontSize: nameFontSize,
      y: height * 0.48,
      xOffset: 100
    };

    const drawCenteredText = (config: { text: string, fontSize: number, y: number, xOffset?: number }) => {
      const textWidth = font.widthOfTextAtSize(config.text, config.fontSize);
      const x = (width - textWidth) / 2 + (config.xOffset || 0);
      
      page.drawText(config.text, {
        x,
        y: config.y,
        size: config.fontSize,
        font,
        color: rgb(0, 0, 0)
      });
    };

    drawCenteredText(nameConfig);

    const modifiedPdfBytes = await pdfDoc.save();
    const base64PDF = Buffer.from(modifiedPdfBytes).toString('base64');

    return {
      success: true,
      message: "Certificate generated successfully",
      data: base64PDF
    };

  } catch (error) {
    console.error("Certificate generation error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to generate certificate"
    };
  }
}

async function verifyParticipant(name: string, rollno: string, email: string): Promise<boolean> {
  try {
    const participants = await getParticipants();
    
    const normalizeName = (str: string) => str.trim().toLowerCase().replace(/\s+/g, ' ');
    const normalizeEmail = (str: string) => str.trim().toLowerCase();
    
    const found = participants.some((p: any) => {
      const matchName = normalizeName(p.name?.toString() || '') === normalizeName(name);
      const matchRollNo = p.rollno?.toString().trim().toLowerCase() === rollno.trim().toLowerCase();
      const matchEmail = normalizeEmail(p.email?.toString() || '') === normalizeEmail(email);
      
      // All three must match
      const isMatch = matchName && matchRollNo && matchEmail;
      
      // Log matching attempts for debugging
      if (matchName && matchRollNo && !matchEmail) {
        console.log("⚠️ Name and Roll No match but email doesn't:", {
          excelEmail: p.email,
          inputEmail: email
        });
      }
      
      if (isMatch) {
        console.log("✅ Participant verified:", { name: p.name, rollno: p.rollno, email: p.email });
      }
      
      return isMatch;
    });

    if (!found) {
      console.log("❌ No matching participant found for:", { name, rollno, email });
    }

    return found;
  } catch (error) {
    console.error("Error verifying participant:", error);
    return false;
  }
}