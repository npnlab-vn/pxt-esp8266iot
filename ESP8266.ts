//% color=#0fbc11 icon="\uf1eb"
namespace ESP8266_IoT {
    let wifi_connected: boolean = false
    let thingspeak_connected: boolean = false
    let kitsiot_connected: boolean = false
    let last_upload_successful: boolean = false
    let userToken_def: string = ""
    let topic_def: string = ""
    let recevice_kidiot_text = ""
    const EVENT_ON_ID = 100
    const EVENT_ON_Value = 200
    const EVENT_OFF_ID = 110
    const EVENT_OFF_Value = 210
    let toSendStr = ""

    export enum State {
        //% block="Success"
        Success,
        //% block="Fail"
        Fail
    }

    // write AT command with CR+LF ending
    function sendAT(command: string, wait: number = 0) {
        serial.writeString(command + "\u000D\u000A")
        basic.pause(wait)
    }

    // wait for certain response from ESP8266
    function waitResponse(): boolean {
        let serial_str: string = ""
        let result: boolean = false
        let time: number = input.runningTime()
        while (true) {
            serial_str += serial.readString()
            if (serial_str.length > 200)
                serial_str = serial_str.substr(serial_str.length - 200)
            if (serial_str.includes("WIFI GOT IP")) {
                result = true
                break
            }
            else if (input.runningTime() - time > 10000) {
                break
            }
        }
        return result
    }
    /**
    * Initialize ESP8266 module 
    */
    //% block="Cài đặt ESP8266|RX %tx|TX %rx|Baud rate %baudrate"
    //% tx.defl=SerialPin.P8
    //% rx.defl=SerialPin.P12
    //% ssid.defl=your_ssid
    //% pw.defl=your_password weight=100
    export function initWIFI(tx: SerialPin, rx: SerialPin, baudrate: BaudRate) {
        serial.redirect(
            tx,
            rx,
            baudrate
        )
        sendAT("AT+RESTORE", 1000) // restore to factory settings
        sendAT("AT+CWMODE=1") // set to STA mode
        basic.pause(1000)
    }
    /**
    * connect to Wifi router
    */
    //% block="Kết nối Wifi SSID = %ssid|KEY = %pw"
    //% ssid.defl=your_ssid
    //% pw.defl=your_pw weight=95
    export function connectWifi(ssid: string, pw: string) {
        wifi_connected = false
        thingspeak_connected = false
        kitsiot_connected = false
        sendAT("AT+CWJAP=\"" + ssid + "\",\"" + pw + "\"", 0) // connect to Wifi router

        let serial_str: string = ""
        let time: number = input.runningTime()
        while (true) {
            serial_str += serial.readString()
            if (serial_str.length > 50)
                serial_str = serial_str.substr(serial_str.length - 50)
            if (serial_str.includes("WIFI GOT IP") || serial_str.includes("OK")) {
                serial_str=""
                wifi_connected = true
                break
            }
            if (serial_str.includes("FAIL")) {
                serial_str=""
                wifi_connected = false
                connectWifi(ssid,pw)
                break
            }
            if (serial_str.includes("WIFI CONNECTED")){}
            else if(input.runningTime() - time > 10000) {
                wifi_connected = false
                connectWifi(ssid,pw)
                break
            }
        }
        basic.pause(2000)
    }
	/**
    * Wait between uploads
    */
    //% block="Đợi kết nối %delay ms"
    //% delay.min=0 delay.defl=5000 weight=90
    export function wait(delay: number) {
        if (delay > 0) basic.pause(delay)
    }

    /**
    * Check if ESP8266 successfully connected to Wifi
    */
    //% block="Kết nối Wifi %State" weight=85
    export function wifiState(state: boolean) {
        if (wifi_connected == state) {
            return true
        }
        else {
            return false
        }
    }
	
    /**
    * Connect to ThingSpeak
    */
    //% block="Kết Nối ThingSpeak"
    //% write_api_key.defl=your_write_api_key weight = 80
    export function connectThingSpeak() {
        if (wifi_connected && kitsiot_connected == false) {
            thingspeak_connected = false
            let text = "AT+CIPSTART=\"TCP\",\"api.thingspeak.com\",80"
            sendAT(text, 0) // connect to website server
            basic.pause(2000)
            thingspeak_connected=true
            /*
            let serial_str: string = ""
            let time: number = input.runningTime()
            while (true) {
                serial_str += serial.readString()
                if (serial_str.length > 100)
                    serial_str = serial_str.substr(serial_str.length - 100)
                if (serial_str.includes("CONNECT") || serial_str.includes("OK")){
                    thingspeak_connected = true
                    break
                }
                if (serial_str.includes("ERROR") || serial_str.includes("CLOSED")) {
                    thingspeak_connected = false
                    break
                }
                if (input.runningTime() - time > 10000) {
                    thingspeak_connected = false
                    break
                }
            }
            */
            //basic.pause(1000)
        }
    }
    
}