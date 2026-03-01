import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db, auth } from "../firebase";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";

import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

import "./Dashboard.css";

export default function Dashboard() {
  const [registrations, setRegistrations] = useState([]);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  // ================= FETCH DATA =================
  useEffect(() => {
    const fetchData = async () => {
      const snapshot = await getDocs(collection(db, "registrations"));
      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setRegistrations(list);
    };

    fetchData();
  }, []);

  // ================= LOGOUT =================
  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  // ================= FILTER =================
  const filteredData = registrations.filter(
    (item) =>
      item.name?.toLowerCase().includes(search.toLowerCase()) ||
      item.pro_number?.toLowerCase().includes(search.toLowerCase())
  );

  // ================= IMAGE CONVERTER =================
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

    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.text("PROGENI'26", 105, 40, { align: "center" });

    doc.setFontSize(16);
    doc.text("Government College of Engineering, Salem", 105, 55, { align: "center" });

    doc.setFontSize(18);
    doc.text("Registration Report", 105, 75, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.text(`Total Registrations: ${registrations.length}`, 105, 95, { align: "center" });
    doc.text(`Generated On: ${new Date().toLocaleString()}`, 105, 105, { align: "center" });

    doc.addPage();

    for (let i = 0; i < registrations.length; i++) {
      const reg = registrations[i];

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text(`Participant ${i + 1}`, 14, 20);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);

      let y = 30;
      const gap = 8;

      doc.text(`Name: ${reg.name}`, 14, y); y += gap;
      doc.text(`College: ${reg.college}`, 14, y); y += gap;
      doc.text(`Department: ${reg.department}`, 14, y); y += gap;
      doc.text(`Year: ${reg.year}`, 14, y); y += gap;
      doc.text(`Phone: ${reg.phone}`, 14, y); y += gap;
      doc.text(`Email: ${reg.email}`, 14, y); y += gap;
      doc.text(`PRO Number: ${reg.pro_number}`, 14, y); y += gap;
      doc.text(`Transaction ID: ${reg.txnId}`, 14, y); y += gap + 4;

      doc.setFont("helvetica", "bold");
      doc.text("Tech Events:", 14, y); y += gap;
      doc.setFont("helvetica", "normal");
      doc.text(reg.techEvents?.join(", ") || "None", 20, y);
      y += gap + 4;

      doc.setFont("helvetica", "bold");
      doc.text("Non-Tech Events:", 14, y); y += gap;
      doc.setFont("helvetica", "normal");
      doc.text(reg.nonTechEvents?.join(", ") || "None", 20, y);
      y += gap + 6;

      if (reg.screenshot) {
        try {
          const base64 = await getBase64FromUrl(reg.screenshot);
          const img = new Image();
          img.src = base64;

          await new Promise((resolve) => {
            img.onload = resolve;
          });

          doc.setFont("helvetica", "bold");
          doc.text("Payment Screenshot:", 14, y);
          y += 10;

          const pageWidth = doc.internal.pageSize.getWidth();
          const maxWidth = 170;
          const maxHeight = 130;

          let width = img.width;
          let height = img.height;

          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;

          const x = (pageWidth - width) / 2;

          doc.addImage(base64, "JPEG", x, y, width, height);

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

  // ================= EXCEL GENERATOR =================
  const generateExcel = () => {
    const excelData = registrations.map((reg) => ({
      Name: reg.name,
      College: reg.college,
      Department: reg.department,
      Year: reg.year,
      Phone: reg.phone,
      Email: reg.email,
      PRO_Number: reg.pro_number,
      Transaction_ID: reg.txnId,
      Tech_Events: reg.techEvents?.join(", ") || "",
      Non_Tech_Events: reg.nonTechEvents?.join(", ") || "",
      Screenshot_URL: reg.screenshot || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Registrations");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    const data = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    saveAs(data, "PROGENI_Registrations.xlsx");
  };

  // ================= UI =================
  return (
    <div className="dashboard-container">
      <div className="dashboard-top">
        <h1>Admin Dashboard</h1>
        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </div>

      <div className="stats-card">
        Total Registrations: {registrations.length}
      </div>

      <div className="dashboard-controls">
        <input
          type="text"
          placeholder="Search by Name or PRO Number"
          onChange={(e) => setSearch(e.target.value)}
        />

        <button className="pdf-btn" onClick={generatePDF}>
          Download PDF
        </button>

        <button className="excel-btn" onClick={generateExcel}>
          Download Excel
        </button>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>College</th>
              <th>Department</th>
              <th>Year</th>
              <th>Txn ID</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((reg) => (
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
    </div>
  );
}