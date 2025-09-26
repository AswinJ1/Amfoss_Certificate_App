"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { UserRound, Mail, Download, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { GraduationCap } from "lucide-react"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  // lastname: z.string().min(1, {
  //   message: "Last name cannot be empty.",
  // }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
   rollno: z.string().min(1, {
    message: "Roll number cannot be empty.",
  }),
})

export function CertificateForm() {
  const [isGenerating, setIsGenerating] = useState(false)
  const { toast } = useToast()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      rollno: "",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsGenerating(true);
      console.log("Submitting form with values:", values);

      // const response = await verifyAndGenerateCertificate(values);
      const response = await fetch("/api/verify-and-generate", {
      method: "POST",
      body: JSON.stringify(values),
      headers: { "Content-Type": "application/json" }
    }).then(res => res.json());


      console.log("Verification response:", response);

      if (!response.success) {
        toast({
          title: "Verification Failed",
          description: `${response.message}. Please check if your email matches your registration. Contact us if you need help.`,
          variant: "destructive",
        });
        return;
      }

      if (!response.data) {
        throw new Error("No certificate data received");
      }

      // Convert base64 to Uint8Array first
      const binaryString = window.atob(response.data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Create blob from Uint8Array
      const pdfBlob = new Blob([bytes], { type: "application/pdf" });

      // Create download link
      const url = window.URL.createObjectURL(pdfBlob);
      
      // Option 1: Direct download
      const a = document.createElement("a");
      a.href = url;
      a.download = `Certificate_${values.name}.pdf`;
      document.body.appendChild(a);
      a.click();

      // Option 2: Open in new tab (add this if you want preview option)
      window.open(url, '_blank');

      // Cleanup
      window.URL.revokeObjectURL(url);
      a.remove();

      toast({
        title: "Certificate Generated",
        description: "Your certificate has been generated. Check your downloads folder.",
      });

      form.reset();
    } catch (error) {
      console.error("Error generating certificate:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate certificate contact us for help.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  }

  return (

     <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-black">Name</FormLabel>
              <FormControl>
                <div className="relative">
                  <UserRound className="absolute left-3 top-3 h-4 w-4 text-black/60" />
                  <Input 
                    placeholder="John" 
                    {...field} 
                    className="w-full pl-10 py-2 bg-transparent border border-black/20 rounded-md text-black placeholder:text-black/50 focus:outline-none focus:border-blue-400 focus:ring-2" 
                  />
                </div>
              </FormControl>
              <FormDescription className="text-black/70 text-xs">
                Enter your name exactly as registered for the event.
              </FormDescription>
              <FormMessage className="text-red-600" />
            </FormItem>
          )}
        />
        
        {/* <FormField
          control={form.control}
          name="lastname"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-black">Last Name</FormLabel>
              <FormControl>
                <div className="relative">
                  <UserRound className="absolute left-3 top-3 h-4 w-4 text-black/60" />
                  <Input 
                    placeholder="Doe" 
                    {...field} 
                    className="pl-10 bg-white/10 border-black/20 text-black placeholder:text-black/50 focus:border-blue-400 focus:ring-blue-400/20" 
                  />
                </div>
              </FormControl>
              <FormDescription className="text-black/70 text-xs">
                Enter your last name exactly as registered for the event.
              </FormDescription>
              <FormMessage className="text-red-600" />
            </FormItem>
          )}
        /> */}

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-black">Email</FormLabel>
              <FormControl>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-black/60" />
                  <Input 
                    type="email" 
                    placeholder="john@example.com" 
                    {...field} 
                    className="pl-10 bg-white/10 border-black/20 text-black placeholder:text-black/50 focus:border-blue-400 focus:ring-blue-400/20" 
                  />
                </div>
              </FormControl>
              <FormDescription className="text-black/70 text-xs">
                Enter the email you used during registration.
              </FormDescription>
              <FormMessage className="text-red-600" />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="rollno"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-black">Roll Number</FormLabel>
              <FormControl>
                <div className="relative">
                  <UserRound className="absolute left-3 top-3 h-4 w-4 text-black/60" />
                  <Input 
                    placeholder="Enter your roll number" 
                    {...field} 
                    className="pl-10 bg-white/10 border-black/20 text-black placeholder:text-black/50 focus:border-blue-400 focus:ring-blue-400/20" 
                  />
                </div>
              </FormControl>
              <FormMessage className="text-red-300" />
            </FormItem>
          )}
        />


        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
          <button 
            type="submit" 
            className="w-full bg-gradient-to-r from-blue-400 to-violet-500 hover:from-blue-500 hover:to-violet-600 text-white border-0 py-2.5 rounded-md shadow-lg shadow-blue-500/30 flex items-center justify-center"
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span>Verifying & Generating...</span>
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                <span>Verify & Download Certificate</span>
              </>
            )}
          </button>
        </motion.div>
      </form>
    </Form>
  )
}
