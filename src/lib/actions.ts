"use server"

import { promises as fs } from "fs"
import path from "path"
import { email, z } from "zod"
import { PDFDocument, rgb } from 'pdf-lib'
import * as XLSX from "xlsx"
import fontkit from '@pdf-lib/fontkit'

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
    // Log inputs for debugging
    console.log("Verifying participant with details:", {
      name: data.name,
      rollno: data.rollno,
      email: data.email
    });

    // Check file paths and existence before proceeding
    const templatePath = path.resolve(process.cwd(), "public", "certificate-template.pdf");
    const fontPath = path.resolve(process.cwd(), 'public', 'fonts', 'Acumin-RPro.otf');
    const excelPath = path.resolve(process.cwd(), "data", "students.xlsx");
    
    console.log("Checking paths:", {
      templatePath,
      fontPath,
      excelPath
    });

    // Check if files exist
    try {
      await fs.access(templatePath);
      await fs.access(fontPath);
      await fs.access(excelPath);
      console.log("All required files exist");
    } catch (error) {
      console.error("File access error:", error);
      return {
        success: false,
        message: `File not found: ${(error as Error).message}`
      };
    }

    const isValidParticipant = await verifyParticipant(
      data.name,
      data.rollno,  
      data.email
    );
    
    console.log("Full verification response:", { success: isValidParticipant });
    
    if (!isValidParticipant) {
      return {
        success: false,
        message: "Participant details not found in registered participants list"
      };
    }

    // Read and modify PDF
    const templateBytes = await fs.readFile(templatePath);
    const fontBytes = await fs.readFile(fontPath);

    const pdfDoc = await PDFDocument.load(templateBytes);
    pdfDoc.registerFontkit(fontkit);
    const font = await pdfDoc.embedFont(fontBytes);
    const page = pdfDoc.getPages()[0];
    const { width, height } = page.getSize();
    
    // Text configurations based on example certificate
    // Name goes below "This certificate is presented to"
    const nameConfig = {
      text: data.name,
      fontSize: 50,
      y: height * 0.45,  // Lowered the name position
      fontStyle: 'bold',
    };


   
    // Team/Project ID below "titled:"


    // Function to center and draw text
    const drawCenteredText = (config: { text: string, fontSize: number, y: number }) => {
      const textWidth = font.widthOfTextAtSize(config.text, config.fontSize);
      const x = (width - textWidth) / 2;
      
      page.drawText(config.text, {
        x,
        y: config.y,
        size: config.fontSize,
        font,
        color: rgb(0,0,0)
      });
    };

    // Draw all text elements
    drawCenteredText(nameConfig);
    // drawCenteredText(rollNoConfig);
    // drawCenteredText(teamNoConfig);
 
    

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
    console.log("Verifying participant with:", { name, rollno, email });

    const filePath = path.resolve(process.cwd(),"data","students.xlsx");
    const fileBuffer = await fs.readFile(filePath);
    const workbook = XLSX.read(fileBuffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const participants = XLSX.utils.sheet_to_json(sheet);
    console.log("Excel columns:", Object.keys(participants[0] || {}));
    console.log("Participants data:", participants);

    const found = participants.some((p: any) => {
      const matchName = p.name?.toString().trim().toLowerCase() === name.trim().toLowerCase();
      const matchRollNo = p.rollno?.toString().trim().toLowerCase() === rollno.trim().toLowerCase();
      console.log("Matching row:", { p, matchName, matchRollNo});
      return matchName && matchRollNo ;
    });

    console.log("Participant found:", found);
    return found;
  } catch (error) {
    console.error("Error verifying participant:", error);
    return false;
  }
}