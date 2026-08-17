import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, onSnapshot, updateDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';

export default function App() {
  const [selectedRole, setSelectedRole] = useState('none');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [feedbacks, setFeedbacks] = useState([]);
  
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Student Form State
  const [studentEmail, setStudentEmail] = useState('');
  const [category, setCategory] = useState('Faculty');
  const [dept, setDept] = useState('CSE');
  const [rating, setRating] = useState('5.0');
  const [comment, setComment] = useState('');

  // Admin/Staff Filter States
  const [filterDept, setFilterDept] = useState('All');
  const [filterCategory, setFilterCategory] = useState('All');

  const ADMIN_PASSWORD = "admin123";
  const STAFF_PASSWORD = "staff123";

  const staffByCategory = {
    Faculty: ['Prof. Ramesh', 'Dr. Suresh'],
    Canteen: ['Mr. Annadurai (Canteen)', 'Mr. Pitchai'],
    Infrastructure: ['Er. Murugan (Maintenance)', 'Er. Senthil'],
    Hostel: ['Warden Balan', 'Warden Selvam'],
    Library: ['Librarian Daniel', 'Asst. Librarian Kumar'],
    Transport: ['Bus Sup. Mariyappan', 'Transport In-charge Raj']
  };

  useEffect(() => {
    const q = query(collection(db, 'feedbacks'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // டேட்டாபேஸில் உள்ள அனைத்து டேட்டாக்களையும் (அந்த 6 டேட்டாக்கள் + புதியவை) அப்படியே டிராக்கரில் காட்டுவது
      setFeedbacks(allData);
    }, (error) => {
      console.error("Firestore Error: ", error);
    });
    return () => unsubscribe();
  }, []);

  const theme = {
    bg: isDarkMode ? '#0f172a' : '#f8fafc',
    cardBg: isDarkMode ? '#1e293b' : '#ffffff',
    text: isDarkMode ? '#f8fafc' : '#0f172a',
    subText: isDarkMode ? '#94a3b8' : '#64748b',
    border: isDarkMode ? '#334155' : '#cbd5e1',
    inputBg: isDarkMode ? '#0f172a' : '#f1f5f9',
    tableHead: isDarkMode ? '#0f172a' : '#e2e8f0'
  };

  const filteredFeedbacks = feedbacks.filter(f => {
    const matchesDept = filterDept === 'All' || f.dept === filterDept;
    const matchesCategory = filterCategory === 'All' || f.category === filterCategory;
    return matchesDept && matchesCategory;
  });

  const lowFeedbacks = filteredFeedbacks.filter(f => Number(f.rating) < 3.0);

  const totalCount = feedbacks.length;
  const openCount = feedbacks.filter(f => Number(f.rating) < 3.0 && (f.actionStatus === 'Open' || (!f.assignedStaff))).length;
  const inProgressCount = feedbacks.filter(f => Number(f.rating) < 3.0 && f.actionStatus === 'In Progress').length;
  const resolvedCount = feedbacks.filter(f => Number(f.rating) < 3.0 && f.actionStatus === 'Resolved').length;

  const handlePrintPDF = () => { window.print(); };

  const cardStyle = {
    background: theme.cardBg,
    borderRadius: '16px',
    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
    padding: '30px',
    marginBottom: '25px',
    border: `1px solid ${theme.border}`,
    color: theme.text
  };

  const gradientBtnStyle = {
    background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
    color: '#ffffff',
    padding: '14px 25px',
    border: 'none',
    borderRadius: '12px',
    fontWeight: '700',
    cursor: 'pointer',
    width: '100%',
    fontSize: '16px',
    boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)'
  };

  const inputStyle = {
    width: '100%',
    padding: '12px 16px',
    marginBottom: '18px',
    borderRadius: '10px',
    border: `1px solid ${theme.border}`,
    background: theme.inputBg,
    color: theme.text,
    boxSizing: 'border-box',
    outline: 'none',
    fontSize: '15px'
  };

  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (!loginEmail.toLowerCase().trim().endsWith('@admin.fx.ac.in')) return alert("❌ Invalid Email! Must end with @admin.fx.ac.in");
    if (loginPassword !== ADMIN_PASSWORD) return alert("❌ Incorrect Password!");
    setIsAuthenticated(true);
  };

  const handleStaffLogin = (e) => {
    e.preventDefault();
    if (!loginEmail.toLowerCase().trim().endsWith('@staff.fx.ac.in')) return alert("❌ Invalid Email! Must end with @staff.fx.ac.in");
    if (loginPassword !== STAFF_PASSWORD) return alert("❌ Incorrect Password!");
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setSelectedRole('none');
    setIsAuthenticated(false);
    setLoginEmail('');
    setLoginPassword('');
    setFilterDept('All');
    setFilterCategory('All');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanEmail = studentEmail.toLowerCase().trim();
    if (!cleanEmail.endsWith('@fx.ac.in')) return alert("❌ Invalid Student Email! Must end with @fx.ac.in");

    const numericRating = Number(rating);
    if (numericRating < 1.0 || numericRating > 5.0) return alert("❌ Rating must be between 1.0 and 5.0!");

    const isLowRating = numericRating < 3.0; 
    try {
      await addDoc(collection(db, 'feedbacks'), {
        email: cleanEmail, 
        dept, 
        category, 
        rating: numericRating, 
        comment,
        status: isLowRating ? 'Action Required' : 'Normal',
        assignedStaff: '', 
        actionStatus: isLowRating ? 'Open' : 'N/A',
        staffRemarks: '',
        createdAt: serverTimestamp()
      });

      alert("✅ Feedback Submitted Successfully!");
      setComment(''); 
      setRating('5.0'); 
      setStudentEmail('');
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const handleAssignDirect = async (id, staffName) => {
    const adminNote = prompt(`Assigning ${staffName}. Enter any instruction or notes (optional):`, "Assigned by Admin for quick action");
    await updateDoc(doc(db, 'feedbacks', id), { 
      assignedStaff: staffName, 
      actionStatus: 'In Progress',
      staffRemarks: adminNote ? `Admin Note: ${adminNote}` : ''
    });
    alert(`✅ Successfully assigned to ${staffName}!`);
  };

  const handleStatusChange = async (id, newStatus, currentRemarks) => {
    let remarks = currentRemarks;
    if (newStatus === 'Resolved') {
      const userRemark = prompt("Enter Staff Remarks / Resolution Notes:", currentRemarks || "Issue resolved successfully");
      if (userRemark !== null) {
        remarks = userRemark;
      }
    }
    await updateDoc(doc(db, 'feedbacks', id), { 
      actionStatus: newStatus, 
      staffRemarks: remarks || '' 
    });
  };

  return (
    <div style={{ padding: '40px 20px', fontFamily: "system-ui, -apple-system, sans-serif", background: theme.bg, minHeight: '100vh', color: theme.text }}>
      
      <div style={{ maxWidth: '1100px', margin: '0 auto 20px auto', display: 'flex', justifyContent: 'flex-end' }}>
        <button 
          onClick={() => setIsDarkMode(!isDarkMode)}
          style={{ background: theme.cardBg, color: theme.text, border: `1px solid ${theme.border}`, padding: '8px 16px', borderRadius: '20px', cursor: 'pointer', fontWeight: '600', fontSize: '14px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}
        >
          {isDarkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
        </button>
      </div>

      {selectedRole === 'none' && (
        <div style={{ maxWidth: '950px', margin: '20px auto', textAlign: 'center' }}>
          <h1 style={{ fontSize: '3rem', marginBottom: '10px', fontWeight: '800' }}>🎓 ActionTrack Portal</h1>
          <p style={{ color: theme.subText, fontSize: '18px', marginBottom: '50px' }}>Select your portal role to continue</p>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '25px' }}>
            {[
              { role: 'student', title: 'Student Portal', icon: '👨‍🎓', desc: 'Submit and track feedback', color: '#38bdf8' },
              { role: 'admin', title: 'Admin Dashboard', icon: '🛡️', desc: 'Manage & assign issues', color: '#34d399' },
              { role: 'staff', title: 'Staff Action Panel', icon: '👨‍🏫', desc: 'Resolve assigned issues', color: '#f472b6' }
            ].map(item => (
              <div 
                key={item.role} 
                onClick={() => setSelectedRole(item.role)}
                style={{ ...cardStyle, cursor: 'pointer', borderTop: `5px solid ${item.color}`, textAlign: 'center' }}
              >
                <div style={{ fontSize: '55px', marginBottom: '15px' }}>{item.icon}</div>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '22px' }}>{item.title}</h3>
                <p style={{ color: theme.subText, fontSize: '14px', margin: 0 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedRole !== 'none' && (
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: theme.cardBg, padding: '16px 30px', borderRadius: '16px', border: `1px solid ${theme.border}`, marginBottom: '30px' }}>
            <h2 style={{ margin: 0, fontSize: '22px' }}>🎓 ActionTrack - <span style={{ color: '#818cf8', textTransform: 'capitalize' }}>{selectedRole}</span></h2>
            <button onClick={handleLogout} style={{ background: '#ef4444', color: '#fff', padding: '10px 20px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700' }}>
              ⬅️ Change Role
            </button>
          </div>

          {selectedRole === 'student' && (
            <div>
              <div style={{ 
                background: theme.cardBg, 
                borderRadius: '24px', 
                padding: '40px', 
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)', 
                border: `1px solid ${theme.border}`,
                maxWidth: '700px',
                margin: '0 auto 40px auto' 
              }}>
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                  <span style={{ fontSize: '40px' }}>📝</span>
                  <h3 style={{ margin: '10px 0 5px 0', color: '#38bdf8', fontSize: '26px' }}>Submit Student Feedback</h3>
                  <p style={{ color: theme.subText, fontSize: '14px', margin: 0 }}>Help us improve your college experience</p>
                </div>

                <form onSubmit={handleSubmit}>
                  <label style={{ fontWeight: '600', color: theme.subText, fontSize: '14px', display: 'block', marginBottom: '8px' }}>College Email ID (@fx.ac.in):</label>
                  <input type="email" value={studentEmail} onChange={e => setStudentEmail(e.target.value)} placeholder="e.g. rahul@fx.ac.in" style={inputStyle} required />

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div>
                      <label style={{ fontWeight: '600', color: theme.subText, fontSize: '14px', display: 'block', marginBottom: '8px' }}>Department:</label>
                      <select value={dept} onChange={e => setDept(e.target.value)} style={inputStyle}>
                        <option>CSE</option><option>ECE</option><option>MECH</option><option>CIVIL</option><option>EEE</option><option>IT</option><option>AI-DS</option><option>MBA</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontWeight: '600', color: theme.subText, fontSize: '14px', display: 'block', marginBottom: '8px' }}>Category:</label>
                      <select value={category} onChange={e => setCategory(e.target.value)} style={inputStyle}>
                        <option>Faculty</option><option>Canteen</option><option>Infrastructure</option><option>Hostel</option><option>Library</option><option>Transport</option>
                      </select>
                    </div>
                  </div>

                  <label style={{ fontWeight: '600', color: theme.subText, fontSize: '14px', display: 'block', marginBottom: '8px' }}>Rating:</label>
                  <input type="number" step="0.1" min="1.0" max="5.0" value={rating} onChange={e => setRating(e.target.value)} style={inputStyle} required />

                  <label style={{ fontWeight: '600', color: theme.subText, fontSize: '14px', display: 'block', marginBottom: '8px' }}>Comments / Issues:</label>
                  <textarea rows="3" value={comment} onChange={e => setComment(e.target.value)} placeholder="Describe your issue in detail..." style={{ ...inputStyle, height: '110px' }} required />

                  <button type="submit" style={gradientBtnStyle}>Submit Feedback Now</button>
                </form>
              </div>

              <div style={cardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
                  <h3 style={{ margin: 0 }}>🔍 My Feedback Tracker (All Submissions)</h3>
                  {studentEmail && (
                    <span style={{ background: '#3b82f6', color: '#fff', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: '700' }}>
                      Total Submissions: {feedbacks.filter(f => f.email && f.email.toLowerCase().trim() === studentEmail.toLowerCase().trim()).length}
                    </span>
                  )}
                </div>

                {feedbacks.length === 0 ? (
                  <p style={{ color: theme.subText, fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>No submissions found in database.</p>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginTop: '15px' }}>
                    <thead>
                      <tr style={{ background: theme.tableHead, color: theme.subText }}>
                        <th style={{ padding: '14px' }}>Email</th>
                        <th style={{ padding: '14px' }}>Dept</th>
                        <th style={{ padding: '14px' }}>Category</th>
                        <th style={{ padding: '14px' }}>Rating</th>
                        <th style={{ padding: '14px' }}>Issue Description</th>
                        <th style={{ padding: '14px' }}>Staff Remarks</th>
                        <th style={{ padding: '14px' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {feedbacks.map(f => {
                        const isGood = Number(f.rating) >= 3.0;
                        const displayRemarks = f.staffRemarks ? f.staffRemarks : (isGood ? 'Acknowledged - Positive Feedback' : 'No remarks yet');

                        return (
                          <tr key={f.id} style={{ borderBottom: `1px solid ${theme.border}` }}>
                            <td style={{ padding: '14px', fontSize: '13px' }}>{f.email}</td>
                            <td style={{ padding: '14px' }}><span style={{ background: theme.inputBg, padding: '4px 8px', borderRadius: '6px' }}>{f.dept}</span></td>
                            <td style={{ padding: '14px' }}><span style={{ fontWeight: '600' }}>{f.category}</span></td>
                            <td style={{ padding: '14px', fontWeight: 'bold', color: isGood ? '#34d399' : '#f87171' }}>{f.rating} / 5.0</td>
                            <td style={{ padding: '14px' }}>{f.comment}</td>
                            <td style={{ padding: '14px', fontStyle: 'italic', color: '#38bdf8' }}>{displayRemarks}</td>
                            <td style={{ padding: '14px' }}>
                              <span style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', background: f.actionStatus === 'Resolved' ? '#064e3b' : (isGood ? '#1e3a8a' : '#78350f'), color: f.actionStatus === 'Resolved' ? '#6ee7b7' : (isGood ? '#93c5fd' : '#fde68a') }}>
                                {isGood ? '⭐ Good Rating' : (f.actionStatus === 'Resolved' ? '🟢 Resolved' : (f.actionStatus === 'In Progress' ? '🟡 In Progress' : '🔴 Open'))}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {selectedRole === 'admin' && (
            <div style={{ maxWidth: isAuthenticated ? '100%' : '420px', margin: '0 auto' }}>
              {!isAuthenticated ? (
                <div style={cardStyle}>
                  <h2 style={{ textAlign: 'center', margin: '0 0 20px 0', color: '#34d399' }}>🛡️ Admin Login</h2>
                  <form onSubmit={handleAdminLogin}>
                    <label style={{ fontWeight: '600', color: theme.subText, fontSize: '14px' }}>Admin Email ID:</label>
                    <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="principal@admin.fx.ac.in" style={inputStyle} required />
                    <label style={{ fontWeight: '600', color: theme.subText, fontSize: '14px' }}>Password:</label>
                    <input type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} placeholder="Password" style={inputStyle} required />
                    <button type="submit" style={gradientBtnStyle}>Login as Admin</button>
                  </form>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '25px' }}>
                    <div style={{ background: theme.cardBg, padding: '22px', borderRadius: '16px', border: `1px solid ${theme.border}`, borderLeft: '6px solid #818cf8' }}>
                      <p style={{ margin: 0, color: theme.subText, fontSize: '14px', fontWeight: '600' }}>Total Feedbacks</p>
                      <h2 style={{ margin: '8px 0 0 0', fontSize: '32px' }}>{totalCount}</h2>
                    </div>

                    <div style={{ background: theme.cardBg, padding: '22px', borderRadius: '16px', border: `1px solid ${theme.border}`, borderLeft: '6px solid #f87171' }}>
                      <p style={{ margin: 0, color: theme.subText, fontSize: '14px', fontWeight: '600' }}>Action Required / Open</p>
                      <h2 style={{ margin: '8px 0 0 0', color: '#f87171', fontSize: '32px' }}>{openCount}</h2>
                    </div>

                    <div style={{ background: theme.cardBg, padding: '22px', borderRadius: '16px', border: `1px solid ${theme.border}`, borderLeft: '6px solid #fbbf24' }}>
                      <p style={{ margin: 0, color: theme.subText, fontSize: '14px', fontWeight: '600' }}>In Progress</p>
                      <h2 style={{ margin: '8px 0 0 0', color: '#fbbf24', fontSize: '32px' }}>{inProgressCount}</h2>
                    </div>

                    <div style={{ background: theme.cardBg, padding: '22px', borderRadius: '16px', border: `1px solid ${theme.border}`, borderLeft: '6px solid #34d399' }}>
                      <p style={{ margin: 0, color: theme.subText, fontSize: '14px', fontWeight: '600' }}>Resolved Issues</p>
                      <h2 style={{ margin: '8px 0 0 0', color: '#34d399', fontSize: '32px' }}>{resolvedCount}</h2>
                    </div>
                  </div>

                  <div style={cardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
                      <h3 style={{ margin: 0, fontSize: '20px' }}>🛡️ Admin Management Dashboard</h3>
                      <button onClick={handlePrintPDF} style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff', padding: '10px 20px', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '14px' }}>
                        📄 Download / Print PDF Report
                      </button>
                    </div>

                    <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', background: theme.inputBg, padding: '15px', borderRadius: '12px', border: `1px solid ${theme.border}`, flexWrap: 'wrap' }}>
                      <div style={{ flex: '1', minWidth: '200px' }}>
                        <label style={{ fontSize: '12px', color: theme.subText, display: 'block', marginBottom: '5px', fontWeight: '600' }}>Filter by Department:</label>
                        <select value={filterDept} onChange={e => setFilterDept(e.target.value)} style={{ ...inputStyle, marginBottom: 0 }}>
                          <option value="All">All Departments</option>
                          <option>CSE</option><option>ECE</option><option>MECH</option><option>CIVIL</option><option>EEE</option><option>IT</option><option>AI-DS</option><option>MBA</option>
                        </select>
                      </div>
                      <div style={{ flex: '1', minWidth: '200px' }}>
                        <label style={{ fontSize: '12px', color: theme.subText, display: 'block', marginBottom: '5px', fontWeight: '600' }}>Filter by Category:</label>
                        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} style={{ ...inputStyle, marginBottom: 0 }}>
                          <option value="All">All Categories</option>
                          <option>Faculty</option><option>Canteen</option><option>Infrastructure</option><option>Hostel</option><option>Library</option><option>Transport</option>
                        </select>
                      </div>
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginTop: '15px' }}>
                      <thead>
                        <tr style={{ background: theme.tableHead, color: theme.subText }}>
                          <th style={{ padding: '14px' }}>Email</th>
                          <th style={{ padding: '14px' }}>Dept</th>
                          <th style={{ padding: '14px' }}>Category</th>
                          <th style={{ padding: '14px' }}>Rating</th>
                          <th style={{ padding: '14px' }}>Issue</th>
                          <th style={{ padding: '14px' }}>Staff Remarks</th>
                          <th style={{ padding: '14px' }}>Assign Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredFeedbacks.length === 0 ? (
                          <tr><td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: theme.subText, fontStyle: 'italic' }}>No feedbacks found matching the filter criteria.</td></tr>
                        ) : (
                          filteredFeedbacks.map(f => {
                            const staffOptions = staffByCategory[f.category] || ['Staff 1', 'Staff 2'];
                            const isGoodRating = Number(f.rating) >= 3.0;
                            const displayRemarks = f.staffRemarks ? f.staffRemarks : (isGoodRating ? 'Acknowledged - Positive Feedback' : 'Pending');

                            return (
                              <tr key={f.id} style={{ borderBottom: `1px solid ${theme.border}` }}>
                                <td style={{ padding: '14px' }}>{f.email}</td>
                                <td style={{ padding: '14px' }}><span style={{ background: theme.inputBg, padding: '4px 8px', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold' }}>{f.dept}</span></td>
                                <td style={{ padding: '14px' }}><span style={{ background: '#312e81', color: '#c7d2fe', padding: '4px 10px', borderRadius: '12px', fontSize: '13px', fontWeight: '600' }}>{f.category}</span></td>
                                <td style={{ padding: '14px', color: isGoodRating ? '#34d399' : '#f87171', fontWeight: 'bold' }}>{f.rating} / 5.0</td>
                                <td style={{ padding: '14px' }}>{f.comment}</td>
                                <td style={{ padding: '14px', fontStyle: 'italic', color: '#38bdf8' }}>{displayRemarks}</td>
                                <td style={{ padding: '14px' }}>
                                  {isGoodRating ? (
                                    <span style={{ color: '#34d399', fontWeight: 'bold', fontSize: '14px' }}>⭐ N/A - Good Rating</span>
                                  ) : !f.assignedStaff ? (
                                    <>
                                      <button onClick={() => handleAssignDirect(f.id, staffOptions[0])} style={{ marginRight: '8px', padding: '8px 12px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '12px' }}>{staffOptions[0]}</button>
                                      <button onClick={() => handleAssignDirect(f.id, staffOptions[1])} style={{ padding: '8px 12px', background: '#06b6d4', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '12px' }}>{staffOptions[1]}</button>
                                    </>
                                  ) : (<b style={{ color: '#34d399', fontSize: '14px' }}>Assigned: {f.assignedStaff}</b>)}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {selectedRole === 'staff' && (
            <div style={{ maxWidth: isAuthenticated ? '100%' : '420px', margin: '0 auto' }}>
              {!isAuthenticated ? (
                <div style={cardStyle}>
                  <h2 style={{ textAlign: 'center', margin: '0 0 20px 0', color: '#f472b6' }}>👨‍🏫 Staff Login</h2>
                  <form onSubmit={handleStaffLogin}>
                    <label style={{ fontWeight: '600', color: theme.subText, fontSize: '14px' }}>Staff Email ID:</label>
                    <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="ramesh@staff.fx.ac.in" style={inputStyle} required />
                    <label style={{ fontWeight: '600', color: theme.subText, fontSize: '14px' }}>Password:</label>
                    <input type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} placeholder="Password" style={inputStyle} required />
                    <button type="submit" style={gradientBtnStyle}>Login as Staff</button>
                  </form>
                </div>
              ) : (
                <div style={cardStyle}>
                  <h3 style={{ marginTop: 0, fontSize: '20px' }}>Staff Action Panel</h3>
                  
                  <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', background: theme.inputBg, padding: '15px', borderRadius: '12px', border: `1px solid ${theme.border}`, flexWrap: 'wrap' }}>
                    <div style={{ flex: '1', minWidth: '200px' }}>
                      <label style={{ fontSize: '12px', color: theme.subText, display: 'block', marginBottom: '5px', fontWeight: '600' }}>Filter by Department:</label>
                      <select value={filterDept} onChange={e => setFilterDept(e.target.value)} style={{ ...inputStyle, marginBottom: 0 }}>
                        <option value="All">All Departments</option>
                        <option>CSE</option><option>ECE</option><option>MECH</option><option>CIVIL</option><option>EEE</option><option>IT</option><option>AI-DS</option><option>MBA</option>
                      </select>
                    </div>
                    <div style={{ flex: '1', minWidth: '200px' }}>
                      <label style={{ fontSize: '12px', color: theme.subText, display: 'block', marginBottom: '5px', fontWeight: '600' }}>Filter by Category:</label>
                      <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} style={{ ...inputStyle, marginBottom: 0 }}>
                        <option value="All">All Categories</option>
                        <option>Faculty</option><option>Canteen</option><option>Infrastructure</option><option>Hostel</option><option>Library</option><option>Transport</option>
                      </select>
                    </div>
                  </div>

                  {lowFeedbacks.filter(f => f.assignedStaff !== '').length === 0 ? (
                    <p style={{ color: '#34d399', textAlign: 'center', padding: '30px 0', fontSize: '16px' }}>✨ No pending assigned issues found!</p>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginTop: '15px' }}>
                      <thead>
                        <tr style={{ background: theme.tableHead, color: theme.subText }}>
                          <th style={{ padding: '14px' }}>Assigned Staff</th>
                          <th style={{ padding: '14px' }}>Category</th>
                          <th style={{ padding: '14px' }}>Rating</th>
                          <th style={{ padding: '14px' }}>Issue</th>
                          <th style={{ padding: '14px' }}>Staff Remarks</th>
                          <th style={{ padding: '14px' }}>Status</th>
                          <th style={{ padding: '14px' }}>Update Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lowFeedbacks.filter(f => f.assignedStaff !== '').map(f => (
                          <tr key={f.id} style={{ borderBottom: `1px solid ${theme.border}` }}>
                            <td style={{ padding: '14px' }}><b>{f.assignedStaff}</b></td>
                            <td style={{ padding: '14px' }}><span style={{ background: '#312e81', color: '#c7d2fe', padding: '4px 10px', borderRadius: '12px', fontSize: '13px', fontWeight: '600' }}>{f.category}</span></td>
                            <td style={{ padding: '14px', color: '#f87171', fontWeight: 'bold' }}>{f.rating} / 5.0</td>
                            <td style={{ padding: '14px' }}>{f.comment}</td>
                            <td style={{ padding: '14px', fontStyle: 'italic', color: '#38bdf8' }}>{f.staffRemarks || 'No remarks yet'}</td>
                            <td style={{ padding: '14px' }}>
                              <span style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', background: f.actionStatus === 'Resolved' ? '#064e3b' : '#78350f', color: f.actionStatus === 'Resolved' ? '#6ee7b7' : '#fde68a' }}>
                                {f.actionStatus === 'Resolved' ? '🟢 Resolved' : '🟡 In Progress'}
                              </span>
                            </td>
                            <td style={{ padding: '14px' }}>
                              <select value={f.actionStatus} onChange={(e) => handleStatusChange(f.id, e.target.value, f.staffRemarks)} style={{ padding: '8px 12px', borderRadius: '8px', border: `1px solid ${theme.border}`, background: theme.inputBg, color: theme.text, fontWeight: '600' }}>
                                <option>In Progress</option>
                                <option>Resolved</option>
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          )}

        </div>
      )}

    </div>
  );
}