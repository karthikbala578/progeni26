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

  const sortByProNumber = (data) => {
    return [...data].sort((a, b) => {
      const numA = parseInt(a.pro_number?.replace(/\D/g, "")) || 0;
      const numB = parseInt(b.pro_number?.replace(/\D/g, "")) || 0;
      return numA - numB;
    });
  };

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

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

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

  const filteredData = sortByProNumber(
    registrations.filter(
      (item) =>
        item.name?.toLowerCase().includes(search.toLowerCase()) ||
        item.pro_number?.toLowerCase().includes(search.toLowerCase())
    )
  );

  // 📧 MAIL DRAFT FUNCTION
  const openEmailDraft = (reg) => {
    const subject = encodeURIComponent(
      "Registration Confirmation for Progeni '26"
    );

    const body = encodeURIComponent(
`Dear ${reg.name},

Greetings from the Progeni ’26 Team.

We are pleased to confirm that your registration for Progeni ’26 – Inter College Symposium has been successfully received.

Registration Details:

Progeni ID: ${reg.pro_number}
College: ${reg.college}
Department: ${reg.department}
Year: ${reg.year}
Phone: ${reg.phone}
Email: ${reg.email}

Technical Events Registered:
${reg.techEvents?.join(", ") || "None"}

Non-Technical Events Registered:
${reg.nonTechEvents?.join(", ") || "None"}

Join Our Whatsapp Group For Further Updates:
https://chat.whatsapp.com/FA5WntjHhP0KRAmW61GWvw

Event Details:
Event Date: 13-03-2026
Venue: GCE Main Auditorium
Reporting Time: 8:30 AM

Note:
Report to the registration desk with your Progeni ID (${reg.pro_number}) for verification.
Please carry your college ID card on the event day.

Best Regards,
Progeni ’26 Team
Government College of Engineering, Salem
Contact: 8072467509
Email: progeni26.gce@gmail.com
Website: www.progeni26.in
`);

    const gmailUrl =
      `https://mail.google.com/mail/?view=cm&fs=1&to=${reg.email}&su=${subject}&body=${body}`;

    window.open(gmailUrl, "_blank");
  };

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
      Tech_Events: reg.techEvents?.join(", ") || "None",
      Non_Tech_Events: reg.nonTechEvents?.join(", ") || "None",
      Status:
        reg.isvalid === 1
          ? "Valid"
          : reg.isvalid === 0
          ? "Invalid"
          : "Pending",
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

        <button className="excel-btn" onClick={generateExcel}>
          Download Excel
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
                      className="action-btn approve"
                      onClick={() => updateValidationStatus(reg.id, 1)}
                    >
                      ✔
                    </button>

                    <button
                      className="action-btn reject"
                      onClick={() => updateValidationStatus(reg.id, 0)}
                    >
                      ✖
                    </button>

                    {/* 📧 Draft Mail Button */}
                    <button
                      className="action-btn mail"
                      onClick={() => openEmailDraft(reg)}
                    >
                      📧
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