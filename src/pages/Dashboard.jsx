import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";

import jsPDF from "jspdf";

export default function Dashboard() {
  const [registrations, setRegistrations] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      const snapshot = await getDocs(collection(db, "registrations"));
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRegistrations(list);
    };

    fetchData();
  }, []);

  const filteredData = registrations.filter(item =>
    item.name?.toLowerCase().includes(search.toLowerCase()) ||
    item.pro_number?.toLowerCase().includes(search.toLowerCase())
  );

  // Convert Image to Base64
  const getBase64FromUrl = async (url) => {
    const res = await fetch(url);
    const blob = await res.blob();

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  };

  // ================= PDF GENERATOR =================
  const generatePDF = async () => {
    const doc = new jsPDF();

    // ================= COVER PAGE =================
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.text("PROGENI 2026", 105, 40, { align: "center" });

    doc.setFontSize(16);
    doc.text("Government College of Engineering, Salem", 105, 55, { align: "center" });

    doc.setFontSize(18);
    doc.text("Registration Report", 105, 75, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.text(`Total Registrations: ${registrations.length}`, 105, 95, { align: "center" });
    doc.text(`Generated On: ${new Date().toLocaleString()}`, 105, 105, { align: "center" });

    doc.addPage();

    // ================= SUMMARY PAGE =================
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Summary Statistics", 14, 20);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);

    const deptCount = {};
    registrations.forEach(r => {
      deptCount[r.department] = (deptCount[r.department] || 0) + 1;
    });

    let y = 35;
    doc.text("Department-wise Count:", 14, y);
    y += 10;

    Object.keys(deptCount).forEach(dept => {
      doc.text(`${dept}: ${deptCount[dept]}`, 20, y);
      y += 8;
    });

    doc.addPage();

    // ================= PARTICIPANT PAGES =================
    for (let i = 0; i < registrations.length; i++) {
      const reg = registrations[i];

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text(`Participant ${i + 1}`, 14, 20);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);

      let startY = 30;
      const space = 8;

      doc.text(`Name: ${reg.name}`, 14, startY); startY += space;
      doc.text(`College: ${reg.college}`, 14, startY); startY += space;
      doc.text(`Department: ${reg.department}`, 14, startY); startY += space;
      doc.text(`Year: ${reg.year}`, 14, startY); startY += space;
      doc.text(`Phone: ${reg.phone}`, 14, startY); startY += space;
      doc.text(`Email: ${reg.email}`, 14, startY); startY += space;
      doc.text(`PRO Number: ${reg.pro_number}`, 14, startY); startY += space;
      doc.text(`Transaction ID: ${reg.txnId}`, 14, startY); startY += space + 4;

      doc.setFont("helvetica", "bold");
      doc.text("Tech Events:", 14, startY); startY += space;
      doc.setFont("helvetica", "normal");
      doc.text(reg.techEvents?.join(", ") || "None", 20, startY);
      startY += space + 4;

      doc.setFont("helvetica", "bold");
      doc.text("Non-Tech Events:", 14, startY); startY += space;
      doc.setFont("helvetica", "normal");
      doc.text(reg.nonTechEvents?.join(", ") || "None", 20, startY);
      startY += space + 6;

      // ===== LARGE SCREENSHOT =====
      if (reg.screenshot) {
        try {
          const base64 = await getBase64FromUrl(reg.screenshot);

          const img = new Image();
          img.src = base64;

          await new Promise(resolve => {
            img.onload = resolve;
          });

          doc.setFont("helvetica", "bold");
          doc.text("Payment Screenshot:", 14, startY);
          startY += 10;

          const pageWidth = doc.internal.pageSize.getWidth();
          const maxWidth = 170;
          const maxHeight = 130;

          let width = img.width;
          let height = img.height;

          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;

          const x = (pageWidth - width) / 2;

          doc.addImage(base64, "JPEG", x, startY, width, height);

        } catch (err) {
          console.log("Image load failed");
        }
      }

      if (i !== registrations.length - 1) {
        doc.addPage();
      }
    }

    doc.save("PROGENI_Formatted_Report.pdf");
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>Admin Dashboard</h1>

      <h3>Total Registrations: {registrations.length}</h3>

      <input
        type="text"
        placeholder="Search by Name or PRO Number"
        onChange={(e) => setSearch(e.target.value)}
        style={{ padding: "6px", marginRight: "10px" }}
      />

      <button
        onClick={generatePDF}
        style={{
          padding: "8px 12px",
          backgroundColor: "#4CAF50",
          color: "white",
          border: "none",
          cursor: "pointer"
        }}
      >
        Download FULL Formatted PDF
      </button>

      <table
        border="1"
        cellPadding="10"
        width="100%"
        style={{ marginTop: "20px", borderCollapse: "collapse" }}
      >
        <thead>
          <tr>
            <th>Name</th>
            <th>College</th>
            <th>Dept</th>
            <th>Year</th>
            <th>Txn</th>
          </tr>
        </thead>
        <tbody>
          {filteredData.map(reg => (
            <tr key={reg.id}>
              <td>{reg.name}</td>
              <td>{reg.college}</td>
              <td>{reg.department}</td>
              <td>{reg.year}</td>
              <td>{reg.txnId}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}