import { Inter, JetBrains_Mono, Noto_Nastaliq_Urdu } from "next/font/google";

export const fontInter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

export const fontJetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const fontNotoNastaliq = Noto_Nastaliq_Urdu({
  subsets: ["arabic"],
  weight: ["400", "500", "700"],
  variable: "--font-noto-nastaliq",
  display: "swap",
});

export const fontVariables = `${fontInter.variable} ${fontJetBrainsMono.variable} ${fontNotoNastaliq.variable}`;
