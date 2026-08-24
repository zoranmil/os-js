/**
 * OPENSHOP FRAMEWORK - UNIVERSAL CHARTS v1.4.2
 * Deo 1/3: Konstruktor, Arhitektura i Generisanje Legende
 */
(function(OS) {
    if (typeof OS === 'undefined') return;

    function Chart(options) {
        this.defaultOptions = {
            option: null,
            type: 'bar', // 'bar', 'line', 'pie', 'donut'
            height: 200,
            labels: [],
            datasets: [],
            options: {
                responsive: true,
                legend: true,
                tooltips: true,
                animated: true,
                is3D: false,
                depth: 15
            }
        };

        // Duboko spajanje konfiguracionih objekata
        this.config = Object.assign({}, this.defaultOptions, options || {});
        this.config.options = Object.assign({}, this.defaultOptions.options, options.options || {});

        this.config.option = typeof this.config.option === 'string' ?
            document.querySelector(this.config.option) : this.config.option;

        if (!this.config.option) return;

        // Korak unazad: Automatsko mapiranje starog v1.0 formata u datasets niz
        if (options.data && (!options.datasets || options.datasets.length === 0)) {
            this.config.datasets = [{
                label: options.title || 'Serija 1',
                data: options.data,
                color: options.color || '#3b82f6'
            }];
        }

        this.init();
    }

    Chart.prototype.init = function() {
        this.container = this.config.option;
        this.container.style.position = 'relative';
        this.container.style.display = 'flex';
        this.container.style.flexDirection = 'column';
        this.render();
    };

    Chart.prototype.render = function() {
        const type = this.config.type;
        let html = '';

        // 1. Generisanje legende na vrhu
        if (this.config.options.legend && (type === 'bar' || type === 'line' || this.config.datasets.length > 1)) {
            html += this.createLegend();
        }

        // Wrapper za grafikon i apsolutne tooltipove
        html += `<div class="os-chart-wrapper" style="position:relative; width:100%; height:${this.config.height}px;">`;
        if (type === 'pie' || type === 'donut') {
            html += this.createPieDonutChart(type);
        } else {
            html += this.createCartesianChart(type);
        }
        html += `</div>`;

        // 2. Dodavanje kontrolne table za izvoz podataka na dno
        html += this.createExportPanel();

        this.container.innerHTML = html;

        if (this.config.options.tooltips) this.bindTooltips();
        this.bindExportEvents();
    };

    Chart.prototype.createLegend = function() {
        let legendHtml = `<div class="os-chart-legend" style="display:flex; flex-wrap:wrap; gap:12px; margin-bottom:10px; font-size:12px; font-family:inherit; color:#4b5563;">`;
        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6b7280'];

        if (this.config.type === 'pie' || this.config.type === 'donut') {
            this.config.labels.forEach((label, idx) => {
                legendHtml += `<div style="display:flex; align-items:center; gap:4px;"><span style="width:12px; height:12px; background:${colors[idx % colors.length]}; border-radius:3px; display:inline-block;"></span><span>${label}</span></div>`;
            });
        } else {
            this.config.datasets.forEach(dataset => {
                legendHtml += `<div style="display:flex; align-items:center; gap:4px;"><span style="width:12px; height:12px; background:${dataset.color || '#3b82f6'}; border-radius:3px; display:inline-block;"></span><span>${dataset.label}</span></div>`;
            });
        }
        return legendHtml + `</div>`;
    };
    /**
     * Deo 2/3: Generator za Cartesian (Bar/Line) i Polar (3D Pie/Donut) grafikone
     */
    Chart.prototype.createCartesianChart = function(type) {
        const datasets = this.config.datasets, labels = this.config.labels, height = this.config.height, isAnimated = this.config.options.animated;
        let allValues = [];
        datasets.forEach(d => allValues = allValues.concat(d.data));
        const maxVal = Math.max(...allValues) * 1.15 || 10, totalItems = labels.length;

        let svgHtml = `<svg width="100%" height="100%" viewBox="0 0 500 ${height}" preserveAspectRatio="none" style="overflow: visible; font-family: inherit;">`;
        for (let i = 0; i <= 3; i++) {
            let y = ((height - 25) / 3) * i;
            svgHtml += `<line x1="25" y1="${y}" x2="500" y2="${y}" stroke="#e5e7eb" stroke-width="1" stroke-dasharray="4,4"/>`;
        }

        const paddingLeft = 30, chartWidth = 500 - paddingLeft, itemWidth = chartWidth / totalItems, baseY = height - 25;
        let pathsHtml = '', elementsHtml = '';

        if (type === 'bar') {
            const numDatasets = datasets.length;
            labels.forEach((label, labelIdx) => {
                datasets.forEach((dataset, setIdx) => {
                    const val = dataset.data[labelIdx] || 0, barHeight = (val / maxVal) * (baseY - 10);
                    const innerWidth = itemWidth * 0.7, subBarWidth = innerWidth / numDatasets;
                    const x = paddingLeft + (labelIdx * itemWidth) + (itemWidth * 0.15) + (setIdx * subBarWidth);
                    const y = isAnimated ? baseY : baseY - barHeight, targetY = baseY - barHeight;

                    elementsHtml += `<rect class="os-chart-element" x="${x}" y="${y}" width="${subBarWidth - 2}" height="${isAnimated ? 0 : barHeight}" fill="${dataset.color || '#3b82f6'}" rx="2" style="transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);" data-target-y="${targetY}" data-target-height="${barHeight}" data-label="${label}" data-set="${dataset.label}" data-val="${val}"></rect>`;
                });
                elementsHtml += `<text x="${paddingLeft + (labelIdx * itemWidth) + (itemWidth / 2)}" y="${height - 5}" font-size="10" fill="#6b7280" text-anchor="middle">${label}</text>`;
            });
        } else if (type === 'line') {
            datasets.forEach((dataset) => {
                let points = [];
                labels.forEach((label, labelIdx) => {
                    const val = dataset.data[labelIdx] || 0;
                    const x = paddingLeft + (labelIdx * itemWidth) + (itemWidth / 2);
                    const y = baseY - ((val / maxVal) * (baseY - 10));
                    points.push(`${x},${y}`);
                    elementsHtml += `<circle class="os-chart-element" cx="${x}" cy="${y}" r="4" fill="${dataset.color || '#3b82f6'}" stroke="#ffffff" stroke-width="2" style="cursor:pointer;" data-label="${label}" data-set="${dataset.label}" data-val="${val}"/><text x="${x}" y="${y - 8}" font-size="9" font-weight="600" fill="#374151" text-anchor="middle">${val}</text>`;
                });
                if (points.length > 0) {
                    const pathData = "M " + points.join(" L "), startX = points[0].split(','), endX = points[points.length - 1].split(',');
                    pathsHtml += `<path d="${pathData} L ${endX[0]},${baseY} L ${startX[0]},${baseY} Z" fill="${dataset.color || '#3b82f6'}" opacity="0.08"/>`;
                    pathsHtml += `<path d="${pathData}" fill="none" stroke="${dataset.color || '#3b82f6'}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="${isAnimated ? 'stroke-dasharray: 1000; stroke-dashoffset: 1000; transition: stroke-dashoffset 1.2s ease-in-out;' : ''}" class="os-line-path"/>`;
                }
            });
            labels.forEach((label, labelIdx) => {
                elementsHtml += `<text x="${paddingLeft + (labelIdx * itemWidth) + (itemWidth / 2)}" y="${height - 5}" font-size="10" fill="#6b7280" text-anchor="middle">${label}</text>`;
            });
        }
        return svgHtml + pathsHtml + elementsHtml + `</svg>`;
    };

    Chart.prototype.createPieDonutChart = function(type) {
        const dataset = this.config.datasets[0] || { data: [] }, data = dataset.data, labels = this.config.labels, height = this.config.height;
        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6b7280'];
        const total = data.reduce((sum, val) => sum + val, 0);

        let cx = 250, cy = height / 2;
        let is3D = this.config.options.is3D;
        let depth = this.config.options.depth || 15;

        // Krucijalna ispravka: Menjamo radijuse u elipsu da spljoštimo pitu pod uglom (Perspektiva)
        let rx = 150;
        let ry = is3D ? 85 : 150;

        let svgHtml = `<svg width="100%" height="100%" viewBox="0 0 500 ${height}" style="overflow: visible; font-family: inherit;">`;
        let accumulatedAngle = 0;

        // Prolaz A: Crtanje trodimenzionalnih bočnih strana (Zidova dubine)
        if (is3D) {
            data.forEach((val, idx) => {
                const angle = (val / total) * 360;
                const color = colors[idx % colors.length];
                const darkColor = this.adjustColorBrightness(color, -25); // Prilagođeno zatamnjenje ivica

                for (let d = depth; d > 0; d--) {
                    let currAngle = accumulatedAngle;
                    const startRad = (currAngle - 90) * Math.PI / 180;
                    const endRad = (currAngle + angle - 90) * Math.PI / 180;

                    const x1 = cx + rx * Math.cos(startRad);
                    const y1 = cy + ry * Math.sin(startRad) + d;
                    const x2 = cx + rx * Math.cos(endRad);
                    const y2 = cy + ry * Math.sin(endRad) + d;

                    svgHtml += `<path d="M ${cx} ${cy + d} L ${x1} ${y1} A ${rx} ${ry} 0 ${angle > 180 ? 1 : 0} 1 ${x2} ${y2} Z" fill="${darkColor}" opacity="0.12"></path>`;
                }
                accumulatedAngle += angle;
            });
        }

        // Prolaz B: Crtanje gornjih površina i sračunavanje procenata u prostoru
        accumulatedAngle = 0;
        data.forEach((val, idx) => {
            const angle = (val / total) * 360;
            const percentage = Math.round((val / total) * 100);
            const color = colors[idx % colors.length];

            const startRad = (accumulatedAngle - 90) * Math.PI / 180;
            const endRad = (accumulatedAngle + angle - 90) * Math.PI / 180;

            const x1 = cx + rx * Math.cos(startRad);
            const y1 = cy + ry * Math.sin(startRad);
            const x2 = cx + rx * Math.cos(endRad);
            const y2 = cy + ry * Math.sin(endRad);

            svgHtml += `<path class="os-chart-element" d="M ${cx} ${cy} L ${x1} ${y1} A ${rx} ${ry} 0 ${angle > 180 ? 1 : 0} 1 ${x2} ${y2} Z" fill="${color}" stroke="#ffffff" stroke-width="1.5" style="transition: transform 0.2s ease; transform-origin: ${cx}px ${cy}px; cursor:pointer;" data-label="${labels[idx] || ''}" data-set="${dataset.label || 'Artikli'}" data-val="${val}" onmouseover="this.style.transform='translateY(-4px)'" onmouseout="this.style.transform='none'"></path>`;

            // Pozicioniranje teksta procenta unutar 3D eliptičnog prostora
            const midRad = startRad + (endRad - startRad) / 2;
            const textX = cx + (rx * 0.65) * Math.cos(midRad);
            const textY = cy + (ry * 0.65) * Math.sin(midRad);

            if (percentage > 4) {
                svgHtml += `<text x="${textX}" y="${textY + 4}" font-size="11" font-weight="bold" fill="#ffffff" text-anchor="middle" style="pointer-events: none; filter: drop-shadow(1px 1px 1px rgba(0,0,0,0.6));">${percentage}%</text>`;
            }

            accumulatedAngle += angle;
        });

        if (type === 'donut') {
            svgHtml += `<ellipse cx="${cx}" cy="${cy}" rx="${rx * 0.5}" ry="${ry * 0.5}" fill="#ffffff"/><text x="${cx}" y="${cy + 5}" font-size="11" font-weight="bold" fill="#1f2937" text-anchor="middle">Ukupno: ${total}</text>`;
        }

        return svgHtml + `</svg>`;
    };

    Chart.prototype.adjustColorBrightness = function(hex, percent) {
        let R = parseInt(hex.substring(1, 3), 16);
        let G = parseInt(hex.substring(3, 5), 16);
        let B = parseInt(hex.substring(5, 7), 16);
        R = parseInt((R * (100 + percent)) / 100);
        G = parseInt((G * (100 + percent)) / 100);
        B = parseInt((B * (100 + percent)) / 100);
        R = (R < 255) ? R : 255; G = (G < 255) ? G : 255; B = (B < 255) ? B : 255;
        let rHex = R.toString(16).padStart(2, '0');
        let gHex = G.toString(16).padStart(2, '0');
        let bHex = B.toString(16).padStart(2, '0');
        return `#${rHex}${gHex}${bHex}`;
    };
    /**
     * Deo 3/3: Eksport sistem (PNG, CSV, PDF), interaktivnost i registracija na OpenShop jezgro
     */
    Chart.prototype.createExportPanel = function() {
        return `
        <div class="os-chart-export-panel" style="display:flex; justify-content:center; gap:8px; margin-top:15px; padding:5px;">
            <button class="os-export-btn btn-png" style="padding:5px 12px; font-size:11px; font-weight:600; background:#f3f4f6; border:1px solid #d1d5db; border-radius:4px; cursor:pointer; color:#374151;">📸 PNG</button>
            <button class="os-export-btn btn-excel" style="padding:5px 12px; font-size:11px; font-weight:600; background:#f3f4f6; border:1px solid #d1d5db; border-radius:4px; cursor:pointer; color:#374151;">📊 Excel</button>
            <button class="os-export-btn btn-pdf" style="padding:5px 12px; font-size:11px; font-weight:600; background:#f3f4f6; border:1px solid #d1d5db; border-radius:4px; cursor:pointer; color:#374151;">📄 PDF</button>
        </div>`;
    };

    Chart.prototype.bindExportEvents = function() {
        const panel = this.container.querySelector('.os-chart-export-panel');
        if (!panel) return;

        panel.querySelector('.btn-png').addEventListener('click', () => this.exportToPNG());
        panel.querySelector('.btn-excel').addEventListener('click', () => this.exportToExcel());
        panel.querySelector('.btn-pdf').addEventListener('click', () => this.exportToPDF());
    };

    Chart.prototype.exportToPNG = function() {
        const svgEl = this.container.querySelector('svg');
        if (!svgEl) return;
        const svgString = new XMLSerializer().serializeToString(svgEl);
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const URL = window.URL || window.webkitURL || window;
        const blobURL = URL.createObjectURL(svgBlob);
        const image = new Image();
        image.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 1000;
            canvas.height = this.config.height * 2;
            const context = canvas.getContext('2d');
            context.fillStyle = '#ffffff';
            context.fillRect(0, 0, canvas.width, canvas.height);
            context.drawImage(image, 0, 0, canvas.width, canvas.height);

            const l = document.createElement('a');
            l.download = 'izvestaj-grafikon.png';
            l.href = canvas.toDataURL('image/png');
            document.body.appendChild(l);
            l.click();
            document.body.removeChild(l);
        };
        image.src = blobURL;
    };

    Chart.prototype.exportToExcel = function() {
        const labels = this.config.labels;
        let csvContent = 'data:text/csv;charset=utf-8,Kategorija;';
        this.config.datasets.forEach(d => { csvContent += d.label + ';'; });
        csvContent += '\r\n';

        labels.forEach((label, idx) => {
            csvContent += label + ';';
            this.config.datasets.forEach(d => { csvContent += (d.data[idx] || 0) + ';'; });
            csvContent += '\r\n';
        });

        const encodedUri = encodeURI(csvContent);
        const l = document.createElement('a');
        l.setAttribute('href', encodedUri);
        l.setAttribute('download', 'statistika_podaci.csv');
        document.body.appendChild(l);
        l.click();
        document.body.removeChild(l);
    };

    Chart.prototype.exportToPDF = function() {
        const originalContent = document.body.innerHTML;
        const chartContent = this.container.innerHTML;
        document.body.innerHTML = `<div style="padding:30px; background:#fff;">${chartContent}</div>`;
        window.print();
        document.body.innerHTML = originalContent;
        window.location.reload();
    };

    Chart.prototype.bindTooltips = function() {
        const wrapper = this.container.querySelector('.os-chart-wrapper');
        let tooltipNode = wrapper.querySelector('.os-chart-tooltip');
        if (!tooltipNode) {
            tooltipNode = document.createElement('div');
            tooltipNode.className = 'os-chart-tooltip';
            tooltipNode.style.cssText = 'position:absolute; background:rgba(17, 24, 39, 0.95); color:#fff; padding:6px 10px; font-size:11px; border-radius:4px; pointer-events:none; opacity:0; transition:opacity 0.15s ease, left 0.05s linear, top 0.05s linear; z-index:9999; font-family:inherit; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); font-weight: 500; white-space: nowrap;';
            wrapper.appendChild(tooltipNode);
        }

        wrapper.querySelectorAll('.os-chart-element').forEach(el => {
            el.addEventListener('mouseenter', function() {
                const label = this.getAttribute('data-label') || '', set = this.getAttribute('data-set') || '', val = this.getAttribute('data-val') || '';
                tooltipNode.innerHTML = `<span style="color:#9ca3af; font-size:10px;">${label}</span><br/><strong style="color:#fff;">${set}: ${val}</strong>`;
                tooltipNode.style.opacity = '1';
            });
            el.addEventListener('mousemove', function(e) {
                const rect = wrapper.getBoundingClientRect();
                tooltipNode.style.left = `${e.clientX - rect.left + 12}px`;
                tooltipNode.style.top = `${e.clientY - rect.top - 35}px`;
            });
            el.addEventListener('mouseleave', function() {
                tooltipNode.style.opacity = '0';
            });
        });

        if (this.config.options.animated) {
            setTimeout(() => {
                this.container.querySelectorAll('rect.os-chart-element').forEach(rect => {
                    rect.setAttribute('y', rect.getAttribute('data-target-y'));
                    rect.setAttribute('height', rect.getAttribute('data-target-height'));
                });
                this.container.querySelectorAll('.os-line-path').forEach(path => {
                    path.style.strokeDashoffset = '0';
                });
            }, 50);
        }
    };

    // Povezivanje na zoranmil/shopera OpenShop globalno jezgro
    (function(OSSelector) {
        if (typeof OSSelector === 'undefined' || !OSSelector.prototype) return;
        OSSelector.prototype.Chart = function(options) {
            return this.each(function() {
                new Chart(Object.assign({ option: this }, options));
            });
        };
    })(window.OpenShop || window.OS);

    window.OS_ChartEngine = Chart;
})(window.OS);
