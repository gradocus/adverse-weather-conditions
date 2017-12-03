"use strict";

if (typeof Date.prototype.toLocaleString !== 'function') {
    Date.prototype.toLocaleString = function (locales, options) {
        if (options && options.month) {
            return [
                "янв.", "февр.", "март", "апр.", "май", "июнь",
                "июль", "авг.", "сент.", "окт.", "нояб.", "дек.",
            ][this.getMonth()];
        }
        var pad = function (n) {
            return n < 10 ? "0" + n : n;
        };
        return pad(this.getDate()) + "." + pad(this.getMonth() + 1)
                                   + "." + this.getFullYear()
                                   + ", " + pad(this.getHours())
                                   + ":" + pad(this.getMinutes())
                                   + ":" + pad(this.getSeconds());
    };
}

var getDay = function (i) {
    return function (date) {
        return (date.getDay() + 7 - i) % 7;
    };
};

d3.timeSunday.getDay = getDay(0);
d3.timeMonday.getDay = getDay(1);
d3.timeTuesday.getDay = getDay(2);
d3.timeWednesday.getDay = getDay(3);
d3.timeThursday.getDay = getDay(4);
d3.timeFriday.getDay = getDay(5);
d3.timeSaturday.getDay = getDay(6);

var toISODateString = function (date) {
    return date.toISOString().split('T')[0];
};

d3.json("data/sources.json", function (err, sources) {
    if (err) throw err;

    var ul = d3.select("#sources-list")
        .selectAll("li")
        .data(sources)
        .enter().append("li")
        .append("ul")
        .attr("class", "list-inline");

    ul.append("li")
        .attr("class", "list-inline-item")
        .append("a")
        .property("href", function (source) {
            return source.url.root.ru;
        })
        .property("target", "_blank")
        .text(function (source) {
            return source.name.ru;
        });

    ul.append("li")
        .attr("class", "list-inline-item")
        .text(function (source) {
            return "(Последнее обращение: "
                + new Date(source.atime).toLocaleString('ru') + ")";
        });

    d3.select("#vSources")
        .on("change", onSourceChange)
        .selectAll("option")
        .data(sources)
        .enter().append("option")
        .property("value", function (source, i) {
            return i;
        })
        .text(function (source) {
            return source.name.ru;
        });

    onSourceChange();

    function onSourceChange() {
        var source = sources[
            d3.select("#vSources").property("value")
        ];
        source.cities.sort(function (city1, city2) {
            if (city1.name.ru > city2.name.ru) return 1;
            if (city1.name.ru < city2.name.ru) return -1;
            return 0
        });
        d3.select("#vCities").html(null)
            .on("change", onCityChange)
            .selectAll("option")
            .data(source.cities)
            .enter().append("option")
            .property("value", function (city, i) {
                return i;
            })
            .text(function (city) {
                return city.name.ru;
            });

        onCityChange();
    }

    function onCityChange() {
        var source = sources[
            d3.select("#vSources").property("value")
        ], city = source.cities[
            d3.select("#vCities").property("value")
        ], awc = [
            "data", source.url.domain, city.path,
        ].join('/') + ".json";

        d3.json(awc, function (err, awc) {
            if (err) throw err;

            var awcDates = awc.length ? [
                new Date(awc[0].daterange[0]),
                new Date(awc[awc.length - 1].daterange[1]),
            ] : [
                new Date(), new Date(),
            ];
            var size = 18;
            var offsetLeft = 25,
                offsetTop = 25;
            var width = offsetLeft * 2 + size * 53 + 2,
                height = offsetTop + size * 7 + 2;

            var color = null;
            switch (source.type) {
                case 'awc':
                    color = d3.scaleQuantize().domain([ 0, 3 ]).range([
                        "#FFFFFF", "#FFCDD2", "#E57373", "#F44336",
                    ]);
                    break;
                case 'br':
                    color = d3.scaleQuantize().domain([ 0, 100 ]).range(
                        Array.apply(null, {
                            length: 101,
                        }).map(function (n, i) {
                            if (i === 0) return "#FFFFFF";
                            else if (i <= 20) return "#00FF00";
                            else if (i <= 50) return "#FFFF00";
                            else return "#FF0000";
                        })
                    );
                    console.log(color)
                    break;
                default:
                    color = d3.scaleQuantize().domain([ 0, 1 ]).range([
                        "#FFFFFF", "#000000",
                    ]);
            }

            var svg = d3.select("#vCharts").html(null)
                .selectAll("svg")
                .data(d3.range(awcDates[0].getFullYear()
                             , awcDates[1].getFullYear() + 1
                    ).reverse())
                .enter().append("svg")
                .attr("width", width)
                .attr("height", height)
                .append("g")
                .attr("transform", "translate(" + offsetLeft
                                          + "," + offsetTop + ")");

            svg.append("text")
                .attr("transform", "translate(-8," + size * 3.5 + ")"
                                 + "rotate(-90)")
                .attr("font-family", "sans-serif")
                .attr("font-size", 18)
                .attr("text-anchor", "middle")
                .text(function (d) {
                    return d;
                });

            svg.selectAll("text")
                .data(function (year) {
                    return d3.timeMonths(new Date(year, 0, 1)
                                       , new Date(year + 1, 1, 1));
                })
                .enter().append("text")
                .attr("transform", function (t0) {
                    var t1 = new Date(t0.getFullYear()
                                    , t0.getMonth() + 1, 0);
                    var w0 = d3.timeMonday.count(d3.timeYear(t0), t0),
                        w1 = d3.timeMonday.count(d3.timeYear(t1), t1);
                    return "translate(" + (
                            (w0 + 1) * size
                          + (w1 - w0) * size / 2
                    ) + ",-8)"
                })
                .attr("font-family", "sans-serif")
                .attr("font-size", 14)
                .attr("text-anchor", "middle")
                .text(function (d) {
                    return d.toLocaleString('ru', {
                        month: "short",
                    });
                });

            var rect = svg.append("g")
                .attr("fill", "none")
                .attr("stroke", "#ccc")
                .selectAll("rect")
                .data(function (d) {
                    return d3.timeDays(new Date(d, 0, 1)
                                     , new Date(d + 1, 0, 1));
                })
                .enter().append("rect")
                .attr("width", size)
                .attr("height", size)
                .attr("x", function (d) {
                    return d3.timeMonday.count(d3.timeYear(d), d) * size;
                })
                .attr("y", function (d) {
                    return d3.timeMonday.getDay(d) * size;
                })
                .datum(d3.timeFormat("%Y-%m-%d"));

            svg.append("g").attr("fill", "none")
                .attr("stroke", "#000")
                .selectAll("path").data(function (d) {
                    return d3.timeMonths(new Date(d, 0, 1)
                                       , new Date(d + 1, 0, 1));
            }).enter().append("path")
              .attr("d", function getMonthPath(t0) {
                var t1 = new Date(t0.getFullYear()
                                , t0.getMonth() + 1, 0),
                    d0 = d3.timeMonday.getDay(t0),
                    w0 = d3.timeMonday.count(d3.timeYear(t0), t0),
                    d1 = d3.timeMonday.getDay(t1),
                    w1 = d3.timeMonday.count(d3.timeYear(t1), t1);
                return "M" + (w0 + 1) * size + "," + d0 * size
                    + "H" + w0 * size + "V" + 7 * size
                    + "H" + w1 * size + "V" + (d1 + 1) * size
                    + "H" + (w1 + 1) * size + "V" + 0
                    + "H" + (w0 + 1) * size + "Z";
            });

            var data = d3.nest().key(function (d) {
                return d.date;
            }).rollup(function (d) {
                var maxValue = Math.max.apply(Math, d.map(function (d) {
                    return d.value;
                }));
                return d.filter(function (d) {
                    return d.value = maxValue;
                })[0];
            }).object(awc.reduce(function (data, row) {
                var start = new Date(row.daterange[0].split('T')[0]),
                    end = new Date(row.daterange[1].split('T')[0]);
                for (var d = start; d <= end; d.setDate(d.getDate() + 1)) {
                    data.push({
                        date: d.toISOString().split('T')[0],
                        value: row.level,
                        url: source.url.root.ru + row.path,
                    });
                }
                return data;
            }, [ ]));

            rect.filter(function (d) {
                return d in data;
            }).attr("cursor", "pointer")
              .attr("fill", function (d) {
                return color(data[d].value);
            }).on("click", function (d, row) {
                console.log(data[d])
            }).html(null).append("title").text(function (d) {
                var date = d.split('-').reverse().join('.');
                switch (source.type) {
                    case 'awc':
                        return date + ": НМУ "
                            + data[d].value + " степени опасности";
                    case 'br':
                        return date + ": Фоновая радиация "
                            + data[d].value + " мк/Рч";
                    default:
                        return date + ": " + data[d].value;
                }
            });
        });
    }
});
