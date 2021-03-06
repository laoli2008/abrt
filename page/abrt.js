function camelize(str) {
    return str.replace(/(?:^\w|[A-Z]|\b\w)/g, function(word, index) {
        return word.toUpperCase();
    });
}

Vue.component('sidebar', {
    template: '#sidebar-template',
    data() {
        return {
            showInputModal: false,
            showSelectModal: false,
            showEditorModal: false,
            selected: { name: "", licnum: "", expiry: "", level:  "", },
            startdate: "",
            enddate: ""
        }
    },
    methods: {
        start: function() {
            //console.log(this.startdate, this.enddate);
            //console.log(this.$root.$data);
            if (this.startdate.length == 0 || this.enddate.length == 0) {
                return;
            }
            if (typeof(browser) != "undefined") {
                var backgroundPage = browser.extension.getBackgroundPage();
                // console.log(backgroundPage);
                backgroundPage.start(this.$root.$data);
            }
        },
        stop: function() {
            if (typeof(browser) != "undefined") {
                var backgroundPage = browser.extension.getBackgroundPage();
                backgroundPage.stop();
            }
        },
        onSelect: function (driver) {
            this.selected = Object.assign({}, driver);
            this.$root.driver = Object.assign({}, driver);
            this.showSelectModal = false;
        }
    },
    attached() {
        flatpickr("#date1", {});
        flatpickr("#date2", {});
    },
    watch: {
        startdate: function(val) {
            this.$root.startdate = val;
        },
        enddate: function(val) {
            this.$root.enddate = val;
        }
    }
})

Vue.component('mainpanel', {
    template: '#main-panel-template',
    methods: {
        speed: function(s) {
            this.$root.speed = s;
          //this.$root.messages.push("Speed: " + s);

            if (typeof(browser) != "undefined") {
                var backgroundPage = browser.extension.getBackgroundPage();
                backgroundPage.setSpeed(s);
            }
        },
        clear: function() {
            this.$root.messages = [];
        }
    },
    computed: {
        text() {
            return this.$root.messages.join("<br>")
        }
    }
})

Vue.component('inputmodal', {
    template: '#input-modal-template',
    data() {
        return {
            name: "",
            licnum: "",
            expiry: "",
            level: "G2"
        }
    },
    methods: {
        save: function() {
            var name = camelize(this.name),
                licnum = this.licnum.toUpperCase(),
                expiry = this.expiry,
                level = this.level;
            if (name.length > 4 && licnum.length == 17 && expiry.length == 10) {
                this.$root.licenses.unshift({name, licnum, expiry, level});
                this.$emit('close')
            }
        }
    },
})

Vue.component('selectmodal', {
    template: '#select-modal-template',
    data() {
        return {
            search: "",
            licenses: this.$root.licenses
        }
    },
    methods: { },
    computed: {
        filteredList() {
            return this.licenses.filter(lic => {
                return lic.name.toLowerCase().includes(this.search.toLowerCase())
            })
        }
    }
})

Vue.component('editormodal', {
    template: '#editor-modal-template',
    data() {
        return {
            text: this.csvtext()
        }
    },
    methods: {
        csvtext() {
            var arr = this.$root.licenses.map((lic) => {
                return lic.licnum + ",  " + lic.expiry + ",  " + (lic.level+ ",").padEnd(5, ' ') + lic.name;
            })
            if (this.$root.email) arr.unshift(this.$root.email);
            return arr.join("\n");
        },
        save() {
            var lines = this.text.split("\n");
            if (this.text.trim().length == 0) return;

            if (lines[0].includes('@')) {
                this.$root.email = lines[0];
                lines = lines.slice(1);
            }

            var licenses = [];
            for (var line of lines) {
                var parts = line.split(",");
                if (parts.length != 4) continue;

                var licnum = parts[0].trim().toUpperCase();
                var expiry = parts[1].trim().toUpperCase();
                var level = parts[2].trim().toUpperCase();
                var name = camelize(parts[3].trim().toLowerCase());

                licenses.push({name, licnum, expiry, level});
            }

            if (licenses.length > 0) this.$root.licenses = licenses;

            this.$emit('close')
        }
    }
})

var vm = new Vue({
    el: '#app',
    data: {
        email: "",
        speed: "",
        startdate: "",
        enddate: "",
        messages: [],
        driver: { name: "", licnum: "", expiry: "", level: "" },
        licenses: [
            /*
            { name: "Dai Yibing",   licnum: "D0175-79008-25604", expiry: "2021/11/05", level: "G2" },
            { name: "Li Yi",        licnum: "L4001-79009-35107", expiry: "2018/08/15", level: "G" },
            { name: "Wong Bryan",   licnum: "W6401-10299-60512", expiry: "2018/08/27", level: "G" },
            { name: "Zheng Huihui", licnum: "Z3351-34709-15805", expiry: "2020/11/17", level: "G" },
            //*/
        ]
    },
    methods: {
        loadData: function () {
            if (typeof(browser) != "undefined") {
                console.log('Load data from browser.storage.local');
                browser.storage.local.get().then(
                    (data) => { // arrow function is right way
                        console.log(data);
                        if (data.licenses.length == 0) {
                            data.email = "";
                            data.licenses = [];
                            return;
                        }
                        this.licenses = data.licenses;
                        this.email = data.email;

                        // if arrow function not used, must do like this
                        // vm.licenses = data.licenses;
                        // vm.email = data.email;
                    },
                    function() { }
                );
            } else {
                var data = JSON.parse(localStorage.getItem("abrt"));
                this.licenses = data.licenses;
                this.email = data.email;
                console.log('Load data from localStorage', this.licenses);
            }
        },
        saveData: function() {
            var data = {};

            data.licenses = JSON.parse(JSON.stringify(this.licenses));
            data.email = this.email;

            if (typeof(browser) != "undefined") {
                browser.storage.local.set(data);
                console.log('Save data to browser.storage.local');
            } else {
                localStorage.setItem("abrt", JSON.stringify(data));
                console.log('Save data to localStorage');
            }
        }
    },
    attached() {
        this.loadData();
        if (typeof(browser) != "undefined") {
            var backgroundPage = browser.extension.getBackgroundPage();
            backgroundPage.attach(document, this.$root.$data);
        }
    },
    watch: {
        licenses: function (val) {
            this.saveData();
        },
        email: function (val) {
            this.saveData();
        }
    }
})
