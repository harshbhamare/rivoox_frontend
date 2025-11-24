import { useState } from 'react';
import { Download, FileSpreadsheet, Loader } from 'lucide-react';
import * as XLSX from 'xlsx';
import './ExportData.css';

const API_BASE = 'https://rivooooox-backnd.vercel.app';

const ExportData = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const showMessage = (message) => {
    setSnackbarMessage(message);
    setShowSnackbar(true);
    setTimeout(() => setShowSnackbar(false), 3000);
  };

  const exportToExcel = async () => {
    try {
      setIsExporting(true);
      const token = localStorage.getItem('token');

      const response = await fetch(`${API_BASE}/api/export/class-data`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch data');
      }

      const { data } = result;
      
      // Create workbook
      const wb = XLSX.utils.book_new();

      // Prepare data for Excel
      const excelData = [];

      // Header row 1: Subject names
      const headerRow1 = ['Roll No', 'Student Name', 'Batch'];
      data.subjects.forEach(subject => {
        headerRow1.push(subject.name, '', ''); // Subject name spans 3 columns
      });
      excelData.push(headerRow1);

      // Header row 2: Submission types
      const headerRow2 = ['', '', ''];
      data.subjects.forEach(subject => {
        if (subject.type === 'practical') {
          headerRow2.push('TA', '', '');
        } else {
          headerRow2.push('CIE', 'TA', 'Defaulter Work');
        }
      });
      excelData.push(headerRow2);

      // Student data rows
      data.students.forEach(student => {
        const row = [student.roll_no, student.name, student.batch];
        
        data.subjects.forEach(subject => {
          const submission = student.submissions[subject.id];
          if (submission) {
            if (subject.type === 'practical') {
              row.push(submission.ta === 'completed' ? '✓' : '○', '', '');
            } else {
              row.push(
                submission.cie === 'completed' ? '✓' : submission.cie === 'N/A' ? 'N/A' : '○',
                submission.ta === 'completed' ? '✓' : '○',
                submission.defaulter === '-' ? '-' : (submission.defaulter === 'completed' ? '✓' : '○')
              );
            }
          } else {
            row.push('', '', '');
          }
        });
        
        excelData.push(row);
      });

      // Add empty rows
      excelData.push([]);
      excelData.push([]);

      // Add footer message
      excelData.push(['Thank you for choosing Rivoox Campus Management System!']);
      excelData.push(['Streamlining education management with innovation and excellence.']);
      excelData.push(['© ' + new Date().getFullYear() + ' Rivoox. All rights reserved.']);

      // Create worksheet
      const ws = XLSX.utils.aoa_to_sheet(excelData);

      // Set column widths
      const colWidths = [
        { wch: 10 }, // Roll No
        { wch: 25 }, // Student Name
        { wch: 10 }  // Batch
      ];
      data.subjects.forEach(() => {
        colWidths.push({ wch: 12 }, { wch: 12 }, { wch: 15 });
      });
      ws['!cols'] = colWidths;

      // Merge cells for subject names
      const merges = [];
      let colIndex = 3; // Start after Roll No, Name, Batch
      data.subjects.forEach(() => {
        merges.push({
          s: { r: 0, c: colIndex },
          e: { r: 0, c: colIndex + 2 }
        });
        colIndex += 3;
      });
      ws['!merges'] = merges;

      // Apply styles
      const range = XLSX.utils.decode_range(ws['!ref']);
      
      for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
          if (!ws[cellAddress]) continue;

          // Header rows styling
          if (R === 0 || R === 1) {
            ws[cellAddress].s = {
              font: { bold: true, sz: 11 },
              fill: { fgColor: { rgb: "4285F4" } },
              alignment: { horizontal: "center", vertical: "center" }
            };
          }

          // Data rows - color code based on status
          if (R > 1 && R < excelData.length - 3) {
            const value = ws[cellAddress].v;
            if (value === '✓') {
              ws[cellAddress].s = {
                font: { color: { rgb: "34A853" }, bold: true, sz: 14 },
                alignment: { horizontal: "center", vertical: "center" }
              };
            } else if (value === '○') {
              ws[cellAddress].s = {
                font: { color: { rgb: "EA4335" }, sz: 12 },
                alignment: { horizontal: "center", vertical: "center" }
              };
            } else if (value === '-' || value === 'N/A') {
              ws[cellAddress].s = {
                font: { color: { rgb: "9AA0A6" }, italic: true },
                alignment: { horizontal: "center", vertical: "center" }
              };
            }
          }

          // Footer styling
          if (R >= excelData.length - 3) {
            ws[cellAddress].s = {
              font: { italic: true, sz: 10, color: { rgb: "5F6368" } },
              alignment: { horizontal: "center" }
            };
          }
        }
      }

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Class Submissions');

      // Generate filename
      const filename = `${data.classInfo.name}_Submissions_${new Date().toISOString().split('T')[0]}.xlsx`;

      // Save file
      XLSX.writeFile(wb, filename);

      showMessage('Data exported successfully!');
    } catch (error) {
      console.error('Error exporting data:', error);
      showMessage(error.message || 'Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="export-data-container">
      <div className="export-header">
        <FileSpreadsheet size={32} className="export-icon" />
        <h2>Export Class Data</h2>
        <p>Download complete submission data for your class in Excel format</p>
      </div>

      <div className="export-content">
        <div className="export-info-card">
          <h3>What's included in the export:</h3>
          <ul className="export-features">
            <li>✓ All students in your class</li>
            <li>✓ All subjects (Theory, Practical, and Electives)</li>
            <li>✓ Submission status for CIE, TA, and Defaulter Work</li>
            <li>✓ Color-coded status indicators</li>
            <li>✓ Student batch information</li>
            <li>✓ Properly formatted Excel spreadsheet</li>
          </ul>
        </div>

        <div className="export-legend">
          <h4>Status Indicators:</h4>
          <div className="legend-items">
            <div className="legend-item">
              <span className="legend-symbol completed">✓</span>
              <span>Completed</span>
            </div>
            <div className="legend-item">
              <span className="legend-symbol pending">○</span>
              <span>Pending</span>
            </div>
            <div className="legend-item">
              <span className="legend-symbol na">-</span>
              <span>Not Applicable</span>
            </div>
          </div>
        </div>

        <button 
          className="export-button"
          onClick={exportToExcel}
          disabled={isExporting}
        >
          {isExporting ? (
            <>
              <Loader size={20} className="spinning" />
              Exporting...
            </>
          ) : (
            <>
              <Download size={20} />
              Export to Excel
            </>
          )}
        </button>
      </div>

      {showSnackbar && (
        <div className="snackbar">
          {snackbarMessage}
        </div>
      )}
    </div>
  );
};

export default ExportData;
