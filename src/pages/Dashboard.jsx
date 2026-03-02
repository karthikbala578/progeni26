import { useEffect, useState } from "react";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
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

  // ================= SORT FUNCTION =================
  const sortByProNumber = (data) => {
    return [...data].sort((a, b) => {
      const numA = parseInt(a.pro_number?.replace(/\D/g, "")) || 0;
      const numB = parseInt(b.pro_number?.replace(/\D/g, "")) || 0;
      return numA - numB;
    });
  };

  // ================= FETCH DATA =================
  useEffect(() => {
    const fetchData = async () => {
      const snapshot = await getDocs(collection(db, "registrations"));
      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setRegistrations(sortByProNumber(list));
    };

    fetchData();
  }, []);

  // ================= LOGOUT =================
  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  // ================= UPDATE STATUS =================
  const updateValidationStatus = async (id, status) => {
    try {
      const docRef = doc(db, "registrations", id);
      await updateDoc(docRef, { isvalid: status });

      setRegistrations((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, isvalid: status } : item
        )
      );
    } catch (err) {
      console.error("Update Error:", err);
    }
  };

  // ================= FILTER =================
  const filteredData = sortByProNumber(
    registrations.filter(
      (item) =>
        item.name?.toLowerCase().includes(search.toLowerCase()) ||
        item.pro_number?.toLowerCase().includes(search.toLowerCase())
    )
  );

  // ================= IMAGE TO BASE64 =================
  const getBase64FromUrl = async (url) => {
    const response = await fetch(url, { mode: "cors" });
    const blob = await response.blob();

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // ================= PDF =================
  const generatePDF = async () => {
    const docPDF = new jsPDF();
    const sortedData = sortByProNumber(registrations);

    docPDF.setFontSize(22);
    docPDF.text("PROGENI'26 - Registration Report", 105, 30, {
      align: "center",
    });

    docPDF.setFontSize(12);
    docPDF.text(
      `Total Registrations: ${sortedData.length}`,
      105,
      45,
      { align: "center" }
    );

    docPDF.addPage();

    for (let i = 0; i < sortedData.length; i++) {
      const reg = sortedData[i];

      docPDF.setFontSize(14);
      docPDF.text(`PRO ID: ${reg.pro_number}`, 14, 20);

      let y = 30;
      const gap = 8;

      docPDF.setFontSize(11);
      docPDF.text(`Name: ${reg.name}`, 14, y); y += gap;
      docPDF.text(`College: ${reg.college}`, 14, y); y += gap;
      docPDF.text(`Department: ${reg.department}`, 14, y); y += gap;
      docPDF.text(`Year: ${reg.year}`, 14, y); y += gap;
      docPDF.text(`Phone: ${reg.phone}`, 14, y); y += gap;
      docPDF.text(`Email: ${reg.email}`, 14, y); y += gap;
      docPDF.text(`Transaction ID: ${reg.txnId}`, 14, y); y += gap;

      // 🔥 EVENTS ADDED
      docPDF.text("Tech Events:", 14, y); y += gap;
      docPDF.text(
        reg.techEvents?.length ? reg.techEvents.join(", ") : "None",
        20,
        y
      );
      y += gap + 2;

      docPDF.text("Non-Tech Events:", 14, y); y += gap;
      docPDF.text(
        reg.nonTechEvents?.length ? reg.nonTechEvents.join(", ") : "None",
        20,
        y
      );
      y += gap + 4;

      docPDF.text(
        `Status: ${
          reg.isvalid === 1
            ? "Valid"
            : reg.isvalid === 0
            ? "Invalid"
            : "Pending"
        }`,
        14,
        y
      );

      y += 10;

      // 🔥 SCREENSHOT
      if (reg.screenshot) {
        try {
          const base64 = await getBase64FromUrl(reg.screenshot);
          const img = new Image();
          img.src = base64;

          await new Promise((resolve) => (img.onload = resolve));

          const pageWidth = docPDF.internal.pageSize.getWidth();
          const maxWidth = 170;
          const maxHeight = 130;

          let width = img.width;
          let height = img.height;

          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;

          const x = (pageWidth - width) / 2;
          const imageType = base64.includes("png") ? "PNG" : "JPEG";

          docPDF.addImage(base64, imageType, x, y, width, height);
        } catch (err) {
          console.log("Image load failed:", err);
        }
      }

      if (i !== sortedData.length - 1) {
        docPDF.addPage();
      }
    }

    docPDF.save("PROGENI_Report.pdf");
  };

  // ================= EXCEL ALL =================
  const generateExcel = () => {
    const sortedData = sortByProNumber(registrations);

    const excelData = sortedData.map((reg) => ({
      PRO_ID: reg.pro_number,
      Name: reg.name,
      College: reg.college,
      Department: reg.department,
      Year: reg.year,
      Phone: reg.phone,
      Email: reg.email,
      Transaction_ID: reg.txnId,
      Tech_Events: reg.techEvents?.length ? reg.techEvents.join(", ") : "None",
      Non_Tech_Events: reg.nonTechEvents?.length
        ? reg.nonTechEvents.join(", ")
        : "None",
      Status:
        reg.isvalid === 1
          ? "Valid"
          : reg.isvalid === 0
          ? "Invalid"
          : "Pending",
      Screenshot_URL: reg.screenshot || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Registrations");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    saveAs(
      new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      "PROGENI_Registrations.xlsx"
    );
  };

  // ================= EXCEL VALID ONLY =================
  const generateValidExcel = () => {
    const validOnly = sortByProNumber(registrations).filter(
      (reg) => reg.isvalid === 1
    );

    if (!validOnly.length) {
      alert("No valid registrations found!");
      return;
    }

    const excelData = validOnly.map((reg) => ({
      PRO_ID: reg.pro_number,
      Name: reg.name,
      College: reg.college,
      Department: reg.department,
      Year: reg.year,
      Phone: reg.phone,
      Email: reg.email,
      Transaction_ID: reg.txnId,
      Tech_Events: reg.techEvents?.length ? reg.techEvents.join(", ") : "None",
      Non_Tech_Events: reg.nonTechEvents?.length
        ? reg.nonTechEvents.join(", ")
        : "None",
      Status: "Valid",
      Screenshot_URL: reg.screenshot || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Valid_Registrations");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    saveAs(
      new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      "PROGENI_Valid_Registrations.xlsx"
    );
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

        <button className="valid-excel-btn" onClick={generateValidExcel}>
          Download Valid Excel
        </button>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>PRO ID</th>
              <th>Name</th>
              <th>College</th>
              <th>Department</th>
              <th>Year</th>
              <th>Txn ID</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {filteredData.map((reg) => (
              <tr key={reg.id}>
                <td>{reg.pro_number}</td>
                <td>{reg.name}</td>
                <td>{reg.college}</td>
                <td>{reg.department}</td>
                <td>{reg.year}</td>
                <td>{reg.txnId}</td>

                <td>
                  <span
                    className={`status ${
                      reg.isvalid === 1
                        ? "valid"
                        : reg.isvalid === 0
                        ? "invalid"
                        : "pending"
                    }`}
                  >
                    {reg.isvalid === 1
                      ? "Valid"
                      : reg.isvalid === 0
                      ? "Invalid"
                      : "Pending"}
                  </span>
                </td>

                <td>
                  <div className="action-group">
                    <button
                      className={`action-btn approve ${
                        reg.isvalid === 1 ? "disabled" : ""
                      }`}
                      disabled={reg.isvalid === 1}
                      onClick={() => updateValidationStatus(reg.id, 1)}
                    >
                      ✔
                    </button>

                    <button
                      className={`action-btn reject ${
                        reg.isvalid === 0 ? "disabled" : ""
                      }`}
                      disabled={reg.isvalid === 0}
                      onClick={() => updateValidationStatus(reg.id, 0)}
                    >
                      ✖
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}