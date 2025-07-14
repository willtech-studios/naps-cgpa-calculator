document.addEventListener('DOMContentLoaded', function() {

    const gradePoints = { 'A': 5, 'B': 4, 'C': 3, 'D': 2, 'E': 1, 'F': 0 };

    function getGradeFromScore(score) {
        if (score >= 70) return 'A';
        if (score >= 60) return 'B';
        if (score >= 50) return 'C';
        if (score >= 45) return 'D';
        if (score >= 40) return 'E';
        return 'F';
    }

    // --- Data Persistence Functions ---

    function saveData() {
        try {
            var data = {
                scores: {},
                electives: {}
            };

            // Save scores from all inputs
            var scoreInputs = document.querySelectorAll('.score');
            for (var i = 0; i < scoreInputs.length; i++) {
                var input = scoreInputs[i];
                var row = input.closest('tr');
                if (!row) continue;

                // Create a unique ID for each input based on its location
                var semester = input.closest('.semester');
                var semesterId = semester ? semester.id : 'unknown';
                var rowIndex = Array.prototype.indexOf.call(row.parentElement.children, row);
                var key = semesterId + '-row-' + rowIndex;

                if (input.value) {
                    data.scores[key] = input.value;
                }
            }

            // Save elective courses
            var electiveCells = document.querySelectorAll('.elective-cell');
            for (var j = 0; j < electiveCells.length; j++) {
                var cell = electiveCells[j];
                var row = cell.closest('tr');
                var tableBody = row.parentElement;
                if (!tableBody.id) continue;

                var electiveData = {
                    code: row.querySelector('.elective-code').value,
                    unit: row.querySelector('.unit').textContent,
                    score: row.querySelector('.score').value
                };

                if (!data.electives[tableBody.id]) {
                    data.electives[tableBody.id] = [];
                }
                data.electives[tableBody.id].push(electiveData);
            }

            localStorage.setItem('cgpaAppData', JSON.stringify(data));
        } catch (e) {
            console.log('Error saving data:', e);
        }
    }

    function loadData() {
        try {
            var data = JSON.parse(localStorage.getItem('cgpaAppData'));
            if (!data) return;

            // Load scores
            if (data.scores) {
                for (var key in data.scores) {
                    if (data.scores.hasOwnProperty(key)) {
                        var parts = key.split('-');
                        var semesterId = parts[0];
                        var rowIndex = parts[2];
                        var semester = document.getElementById(semesterId);
                        if (semester) {
                            var rows = semester.querySelectorAll('tbody tr');
                            if (rows[rowIndex]) {
                                var scoreInput = rows[rowIndex].querySelector('.score');
                                scoreInput.value = data.scores[key];
                                // Trigger input event manually for Safari compatibility
                                var event = document.createEvent('Event');
                                event.initEvent('input', true, true);
                                scoreInput.dispatchEvent(event);
                            }
                        }
                    }
                }
            }

            // Load electives
            if (data.electives) {
                for (var tableBodyId in data.electives) {
                    if (data.electives.hasOwnProperty(tableBodyId)) {
                        var tableBody = document.getElementById(tableBodyId);
                        var electives = data.electives[tableBodyId];
                        for (var k = 0; k < electives.length; k++) {
                            addElectiveRow(tableBody, electives[k].unit, electives[k]);
                        }
                    }
                }
            }
        } catch (e) {
            console.log('Error loading data:', e);
        }
    }

    function applyFlash(element) {
        element.classList.add('gpa-flash');
        setTimeout(function() {
            element.classList.remove('gpa-flash');
        }, 700); // Match animation duration
    }

    // Function to calculate GPA for a set of table rows
    function calculateGPA(rows) {
        var totalUnits = 0;
        var totalPoints = 0;

        for (var i = 0; i < rows.length; i++) {
            var row = rows[i];
            var unitEl = row.querySelector('.unit');
            var gradeEl = row.querySelector('.grade');

            if (unitEl && gradeEl && gradeEl.textContent !== '') {
                var units = parseInt(unitEl.textContent, 10);
                var grade = gradeEl.textContent;
                var points = gradePoints[grade];

                if (!isNaN(units) && points !== undefined) {
                    totalUnits += units;
                    totalPoints += units * points;
                }
            }
        }

        return totalUnits > 0 ? (totalPoints / totalUnits).toFixed(2) : '0.00';
    }

    // Auto-update grade when score is entered
    var scoreInputs = document.querySelectorAll('.score');
    for (var i = 0; i < scoreInputs.length; i++) {
        scoreInputs[i].addEventListener('input', function(e) {
            var score = parseInt(e.target.value, 10);
            var gradeCell = e.target.closest('tr').querySelector('.grade');
            if (!isNaN(score) && score >= 0 && score <= 100) {
                gradeCell.textContent = getGradeFromScore(score);
            } else {
                gradeCell.textContent = '';
            }
            saveData(); // Save data on every score change
        });
    }

    // Handle Semester GPA calculation
    var gpaButtons = document.querySelectorAll('.calculate-gpa-btn');
    for (var i = 0; i < gpaButtons.length; i++) {
        gpaButtons[i].addEventListener('click', function(e) {
            var tableId = e.target.getAttribute('data-table-id');
            var semesterDiv = document.getElementById(tableId);
            var rows = semesterDiv.querySelectorAll('tbody tr');
            var gpa = calculateGPA(Array.prototype.slice.call(rows));
            var gpaElement = document.getElementById('gpa-' + tableId);
            gpaElement.textContent = gpa;
            applyFlash(gpaElement);
        });
    }

    // Handle Cumulative GPA calculation
    var cumulativeButtons = document.querySelectorAll('.calculate-cumulative-gpa-btn');
    for (var i = 0; i < cumulativeButtons.length; i++) {
        cumulativeButtons[i].addEventListener('click', function(e) {
            var year = parseInt(e.target.getAttribute('data-year'), 10);
            var rowsToCalculate = [];

            for (var j = 1; j <= year; j++) {
                var yearDetails = document.getElementById('year-' + j);
                if (yearDetails) {
                    var rows = yearDetails.querySelectorAll('tbody tr');
                    rowsToCalculate = rowsToCalculate.concat(Array.prototype.slice.call(rows));
                }
            }
            
            var cgpa = calculateGPA(rowsToCalculate);
            var gpaElement = document.getElementById('gpa-year-' + year);
            gpaElement.textContent = cgpa;
            applyFlash(gpaElement);
        });
    }

    function addElectiveRow(tableBody, unitLoad, electiveData) {
        var newRow = document.createElement('tr');
        newRow.innerHTML = 
            '<td class="elective-cell">' +
                '<input type="text" placeholder="Course Code" class="elective-code">' +
                '<button class="remove-row-btn">&times;</button>' +
            '</td>' +
            '<td class="unit">' + unitLoad + '</td>' +
            '<td><input type="number" class="score" min="0" max="100"></td>' +
            '<td class="grade"></td>';

        var scoreInput = newRow.querySelector('.score');
        var codeInput = newRow.querySelector('.elective-code');

        if (electiveData) {
            codeInput.value = electiveData.code;
            scoreInput.value = electiveData.score;
            // Trigger input event manually for Safari compatibility
            var event = document.createEvent('Event');
            event.initEvent('input', true, true);
            scoreInput.dispatchEvent(event);
        }

        scoreInput.addEventListener('input', function(event) {
             var score = parseInt(event.target.value, 10);
             var gradeCell = event.target.closest('tr').querySelector('.grade');
             if (!isNaN(score) && score >= 0 && score <= 100) {
                 gradeCell.textContent = getGradeFromScore(score);
             } else {
                 gradeCell.textContent = '';
             }
             saveData();
        });

        codeInput.addEventListener('input', saveData);

        newRow.querySelector('.remove-row-btn').addEventListener('click', function(event) {
            event.target.closest('tr').remove();
            saveData();
        });

        tableBody.appendChild(newRow);
    }

    // Handle adding elective courses
    var electiveButtons = document.querySelectorAll('.add-elective-btn');
    for (var i = 0; i < electiveButtons.length; i++) {
        electiveButtons[i].addEventListener('click', function(e) {
            var tableBodyId = e.target.getAttribute('data-table-body-id');
            var unitLoad = e.target.getAttribute('data-unit-load');
            var tableBody = document.getElementById(tableBodyId);
            addElectiveRow(tableBody, unitLoad);
            saveData();
        });
    }

    // Load existing data when the page loads
    loadData();

    // Handle Clear All Data button
    var clearAllBtn = document.getElementById('clearAllBtn');
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', function() {
            if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
                // Clear all score inputs
                var scoreInputs = document.querySelectorAll('.score');
                for (var i = 0; i < scoreInputs.length; i++) {
                    scoreInputs[i].value = '';
                    var event = document.createEvent('Event');
                    event.initEvent('input', true, true);
                    scoreInputs[i].dispatchEvent(event);
                }

                // Clear all elective course inputs
                var electiveInputs = document.querySelectorAll('.elective-code');
                for (var i = 0; i < electiveInputs.length; i++) {
                    electiveInputs[i].value = '';
                }

                // Remove all elective rows
                var electiveCells = document.querySelectorAll('.elective-cell');
                for (var i = 0; i < electiveCells.length; i++) {
                    var row = electiveCells[i].closest('tr');
                    if (row) {
                        row.remove();
                    }
                }

                // Reset all GPA results
                var gpaSpans = document.querySelectorAll('.gpa-result span');
                for (var i = 0; i < gpaSpans.length; i++) {
                    gpaSpans[i].textContent = '0.00';
                }

                // Clear localStorage
                try {
                    localStorage.removeItem('cgpaAppData');
                } catch (e) {
                    console.log('Error clearing localStorage:', e);
                }

                // Show success message
                alert('All data has been cleared successfully!');
            }
        });
    }

    // Handle Export to PDF button
    var exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', function() {
            // Create a print-friendly version
            var printWindow = window.open('', '_blank');
            if (!printWindow) {
                alert('Please allow popups to export your report.');
                return;
            }
            
            var currentDate = new Date().toLocaleDateString();
            
            // Get all the data for the report
            var reportContent = 
                '<!DOCTYPE html>' +
                '<html>' +
                '<head>' +
                    '<title>CGPA Report - ' + currentDate + '</title>' +
                    '<style>' +
                        'body { font-family: Arial, sans-serif; margin: 20px; }' +
                        '.header { text-align: center; margin-bottom: 30px; }' +
                        '.year-section { margin-bottom: 30px; page-break-inside: avoid; }' +
                        '.semester { margin-bottom: 20px; }' +
                        'table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }' +
                        'th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }' +
                        'th { background-color: #f2f2f2; }' +
                        '.gpa-result { font-weight: bold; margin: 10px 0; }' +
                        '.actions { display: none; }' +
                        '@media print { body { margin: 0; } }' +
                    '</style>' +
                '</head>' +
                '<body>' +
                    '<div class="header">' +
                        '<h1>Physics And Astronomy, UNN CGPA Calculator</h1>' +
                        '<p>Report Generated: ' + currentDate + '</p>' +
                    '</div>';

            // Add each year's data only if it has content
            for (var year = 1; year <= 3; year++) {
                var yearDetails = document.getElementById('year-' + year);
                if (yearDetails) {
                    var yearTitle = yearDetails.querySelector('summary').textContent;
                    yearTitle = yearTitle.replace('Calculate ', ''); // Remove "Calculate" from the title for the report
                    var semesters = yearDetails.querySelectorAll('.semester');
                    var yearHasContent = false;
                    var yearContent = '<div class="year-section"><h2>' + yearTitle + '</h2>';
                    
                    for (var s = 0; s < semesters.length; s++) {
                        var semester = semesters[s];
                        var semesterTitle = semester.querySelector('h2').textContent;
                        var table = semester.querySelector('table');
                        var gpaResult = semester.querySelector('.gpa-result');
                        
                        // Check if semester has any entered scores
                        var scoreInputs = semester.querySelectorAll('.score');
                        var semesterHasScores = false;
                        for (var si = 0; si < scoreInputs.length; si++) {
                            if (scoreInputs[si].value && scoreInputs[si].value.trim() !== '') {
                                semesterHasScores = true;
                                break;
                            }
                        }
                        
                        // Only include semester if it has scores and GPA has been calculated
                        if (semesterHasScores && gpaResult && gpaResult.textContent.indexOf('0.00') === -1) {
                            yearHasContent = true;
                            yearContent += '<div class="semester"><h3>' + semesterTitle + '</h3>';
                            
                            // Add table with only rows that have scores
                            if (table) {
                                var tbody = table.querySelector('tbody');
                                var rows = tbody.querySelectorAll('tr');
                                var tableContent = 
                                    '<table>' +
                                        '<thead>' +
                                            '<tr>' +
                                                '<th>Course</th>' +
                                                '<th>Unit Load</th>' +
                                                '<th>Score</th>' +
                                                '<th>Grade</th>' +
                                            '</tr>' +
                                        '</thead>' +
                                        '<tbody>';
                                
                                for (var r = 0; r < rows.length; r++) {
                                    var row = rows[r];
                                    var scoreInput = row.querySelector('.score');
                                    var gradeCell = row.querySelector('.grade');
                                    if (scoreInput && scoreInput.value && scoreInput.value.trim() !== '') {
                                        var courseCell = row.querySelector('td:first-child');
                                        var unitCell = row.querySelector('.unit');
                                        tableContent += 
                                            '<tr>' +
                                                '<td>' + (courseCell ? courseCell.textContent : '') + '</td>' +
                                                '<td>' + (unitCell ? unitCell.textContent : '') + '</td>' +
                                                '<td>' + scoreInput.value + '</td>' +
                                                '<td>' + (gradeCell ? gradeCell.textContent : '') + '</td>' +
                                            '</tr>';
                                    }
                                }
                                
                                tableContent += '</tbody></table>';
                                yearContent += tableContent;
                            }
                            
                            // Add GPA result
                            if (gpaResult) {
                                yearContent += '<div class="gpa-result">' + gpaResult.textContent + '</div>';
                            }
                            
                            yearContent += '</div>';
                        }
                    }
                    
                    // Add cumulative GPA only if year has content
                    var cumulativeGPA = yearDetails.querySelector('.cumulative-gpa-section .gpa-result');
                    if (yearHasContent && cumulativeGPA && cumulativeGPA.textContent.indexOf('0.00') === -1) {
                        yearContent += '<div class="gpa-result" style="text-align: center;">' + cumulativeGPA.textContent + '</div>';
                    }
                    
                    yearContent += '</div>';
                    
                    // Only add year section if it has any content
                    if (yearHasContent) {
                        reportContent += yearContent;
                    }
                }
            }

            reportContent += 
                '<div style="margin-top: 40px; text-align: center; font-size: 0.9em; color: #666;">' +
                    '<p>Generated by Willtech Studios CGPA Calculator</p>' +
                '</div>' +
            '</body>' +
            '</html>';

            printWindow.document.write(reportContent);
            printWindow.document.close();

            setTimeout(function() {
                printWindow.focus();
                printWindow.print();
                printWindow.close();
            }, 500);
        });
    }

    function setupFAQToggle() {
        var faqItems = document.querySelectorAll('.faq-item');
        for (var i = 0; i < faqItems.length; i++) {
            var item = faqItems[i];
            var question = item.querySelector('.faq-question');
            question.addEventListener('click', function() {
                // This allows details-summary toggle via clicks
            });
        }
    }

    // --- THEME SWITCHER LOGIC ---
    var themeToggle = document.getElementById('theme-toggle');
    var body = document.body;

    function applyTheme(theme) {
        body.setAttribute('data-theme', theme);
        try {
            localStorage.setItem('theme', theme);
        } catch (e) {
            console.log('Error saving theme:', e);
        }
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            var currentTheme = body.getAttribute('data-theme');
            var newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            applyTheme(newTheme);
        });
    }

    // Load saved theme or use system preference on initial load
    try {
        var savedTheme = localStorage.getItem('theme');
        var systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

        if (savedTheme) {
            applyTheme(savedTheme);
        } else if (systemPrefersDark) {
            applyTheme('dark');
        } else {
            applyTheme('light');
        }
    } catch (e) {
        console.log('Error loading theme:', e);
        applyTheme('light'); // Default to light theme
    }

    // --- INITIAL PAGE LOAD ---
    setupFAQToggle();
});
