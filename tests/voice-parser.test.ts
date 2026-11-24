import { describe, expect, it } from "vitest";
import {
  parseVoiceTranscript,
  matchCustomerInDatabase,
} from "@/lib/voice-parser";

describe("Voice Parser - Hinglish & Hindi", () => {
  it("parses debit (GAVE) transactions with person, amount, and note", () => {
    const result1 = parseVoiceTranscript("Ramesh 2 chai 40 rupaye baaki");
    expect(result1.type).toBe("GAVE");
    expect(result1.amount).toBe(40);
    expect(result1.personName).toBe("Ramesh");
    expect(result1.note).toBe("2 chai");
    expect(result1.confidence).toBeGreaterThanOrEqual(0.9);

    const result2 = parseVoiceTranscript("Ramesh ko 50 rupaye udhar diya");
    expect(result2.type).toBe("GAVE");
    expect(result2.amount).toBe(50);
    expect(result2.personName).toBe("Ramesh");
    expect(result2.note).toBeNull();

    const result3 = parseVoiceTranscript("Sonu 3 cup chai 60 diya");
    expect(result3.type).toBe("GAVE");
    expect(result3.amount).toBe(60);
    expect(result3.personName).toBe("Sonu");
    expect(result3.note).toBe("3 cup chai");

    const result4 = parseVoiceTranscript("Chai sutta 60 rupaye Sharma ji baaki");
    expect(result4.type).toBe("GAVE");
    expect(result4.amount).toBe(60);
    expect(result4.personName).toBe("Sharma Ji");
    expect(result4.note?.toLowerCase()).toBe("chai sutta");

    const result5 = parseVoiceTranscript("Pappu 5 chai 100 rs udhar");
    expect(result5.type).toBe("GAVE");
    expect(result5.amount).toBe(100);
    expect(result5.personName).toBe("Pappu");
    expect(result5.note).toBe("5 chai");
  });

  it("parses credit (RECEIVED) transactions", () => {
    const result1 = parseVoiceTranscript("Suresh se 200 jama mila");
    expect(result1.type).toBe("RECEIVED");
    expect(result1.amount).toBe(200);
    expect(result1.personName).toBe("Suresh");
    expect(result1.note).toBeNull();

    const result2 = parseVoiceTranscript("Vikram payment 500 online aaya");
    expect(result2.type).toBe("RECEIVED");
    expect(result2.amount).toBe(500);
    expect(result2.personName).toBe("Vikram");
    expect(result2.note).toBe("online");

    const result2b = parseVoiceTranscript("Vikram Mehta ne mere ko 5000 rupees diye");
    expect(result2b.type).toBe("RECEIVED");
    expect(result2b.amount).toBe(5000);
    expect(result2b.personName).toBe("Vikram Mehta");

    const result3 = parseVoiceTranscript("Got 500 from Rajesh");
    expect(result3.type).toBe("RECEIVED");
    expect(result3.amount).toBe(500);
    expect(result3.personName).toBe("Rajesh");

    const result4 = parseVoiceTranscript("Mahesh 1500 received");
    expect(result4.type).toBe("RECEIVED");
    expect(result4.amount).toBe(1500);
    expect(result4.personName).toBe("Mahesh");

    const result5 = parseVoiceTranscript("Paanch sau rupaye jama Deepak");
    expect(result5.type).toBe("RECEIVED");
    expect(result5.amount).toBe(500);
    expect(result5.personName).toBe("Deepak");
  });

  it("handles Indian number words (dedh sau, dhai sau, hazaar, etc.)", () => {
    const r1 = parseVoiceTranscript("Mukesh ko dedh sau rupaye udhar");
    expect(r1.amount).toBe(150);
    expect(r1.type).toBe("GAVE");
    expect(r1.personName).toBe("Mukesh");

    const r2 = parseVoiceTranscript("Dhai sau jama by Rahul");
    expect(r2.amount).toBe(250);
    expect(r2.type).toBe("RECEIVED");
    expect(r2.personName).toBe("Rahul");

    const r3 = parseVoiceTranscript("Pawan do hazaar rupaye diya");
    expect(r3.amount).toBe(2000);
    expect(r3.type).toBe("GAVE");
    expect(r3.personName).toBe("Pawan");
  });

  it("parses English formats", () => {
    const res = parseVoiceTranscript("Gave 100 to Amit for samosa");
    expect(res.type).toBe("GAVE");
    expect(res.amount).toBe(100);
    expect(res.personName).toBe("Amit");
    expect(res.note).toBe("samosa");
  });

  it("parses Hindi Devanagari text", () => {
    const r1 = parseVoiceTranscript("रमेश को 50 रुपये उधार दिए");
    expect(r1.type).toBe("GAVE");
    expect(r1.amount).toBe(50);
    expect(r1.personName).toBe("रमेश");

    const r2 = parseVoiceTranscript("सुरेश 100 जमा");
    expect(r2.type).toBe("RECEIVED");
    expect(r2.amount).toBe(100);
    expect(r2.personName).toBe("सुरेश");

    const r3 = parseVoiceTranscript("मुकेश डेढ़ सौ रुपये जमा");
    expect(r3.type).toBe("RECEIVED");
    expect(r3.amount).toBe(150);
    expect(r3.personName).toBe("मुकेश");
  });

  it("matches English customer names from Gujarati, Hindi, and Hinglish spoken text", () => {
    const customers = [
      { id: "1", name: "Vikram Mehta", phone: null },
      { id: "2", name: "Jignesh Patel", phone: null },
      { id: "3", name: "Ramesh Kumar", phone: null },
    ];

    const m1 = matchCustomerInDatabase("વિક્રમ મહેતા ને ૫૦૦૦ આપ્યા", null, customers);
    expect(m1.matchedPerson?.name).toBe("Vikram Mehta");

    const m2 = matchCustomerInDatabase("જીગ્નેશ પટેલ ૫૦૦ ઉધાર", null, customers);
    expect(m2.matchedPerson?.name).toBe("Jignesh Patel");

    const m3 = matchCustomerInDatabase("रमेश कुमार को 200 उधार", null, customers);
    expect(m3.matchedPerson?.name).toBe("Ramesh Kumar");

    const m4 = matchCustomerInDatabase("Jigneshbhai ne 500 diye", null, customers);
    expect(m4.matchedPerson?.name).toBe("Jignesh Patel");
  });
});
