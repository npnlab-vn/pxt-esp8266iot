//% color=#0fbc11 icon="\uf1eb"
//% groups="['ESP8266', 'ThingSpeak', 'Adafruit','Thời gian Internet']"
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
    let httpGetCmd = ""
    
    let internet_hour:number = 0
    let internet_minute: number = 0
    let internet_second: number = 0
    let internet_day: number = 0
    let internet_month:number = 0
    let internet_year:number = 0

    export enum State {
        //% block="Success"
        Success,
        //% block="Fail"
        Fail
    }

    enum HttpMethod {
        GET,
        POST,
        PUT,
        HEAD,
        DELETE,
        PATCH,
        OPTIONS,
        CONNECT,
        TRACE
    }

    enum Newline {
        CRLF,
        LF,
        CR
    }

    // write AT command with CR+LF ending
    function sendAT(command: string, wait: number = 0) {
        serial.writeString(command + "\u000D\u000A")
        basic.pause(wait)
    }

    function sendCMD(cmd: string, wait: number = 0){
        serial.writeString("!" + cmd + "#")
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
    //% group=ESP8266
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
    //% group=ESP8266
    //% ssid.defl=Tên_Mạng
    //% pw.defl=Mật_Khẩu weight=95
    export function connectWifi(ssid: string, pw: string) {
        wifi_connected = false
        thingspeak_connected = false
        kitsiot_connected = false
        sendAT("AT+CWJAP=\"" + ssid + "\",\"" + pw + "\"", 200) // connect to Wifi router

        sendCMD(ssid + ":" + pw, 200)

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
            if (serial_str.includes("SUCC") || serial_str.includes("SUCC#")) {
                serial_str = ""
                wifi_connected = true
                break
            }
            if (serial_str.includes("FAIL") || serial_str.includes("FAIL#")) {
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
        serial.readString()
    }
	/**
    * Wait between uploads
    */
    //% block="Đợi kết nối %delay ms"
    //% group=ESP8266
    //% delay.min=0 delay.defl=5000 weight=90
    export function wait(delay: number) {
        if (delay > 0) basic.pause(delay)
    }

    /**
    * Check if ESP8266 successfully connected to Wifi
    */
    //% block="Kết nối Wifi %State?"
    //% group="ESP8266"
    //% weight=85
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
    //% block="Kết nối ThingSpeak"
    //% group=ThingSpeak
    //% write_api_key.defl=your_write_api_key 
    //% weight=80
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
    /**
    * Connect to ThingSpeak and set data. 
    */
    //% block="Thiết lập dữ liệu | Write API key = %write_api_key|Field 1 = %n1||Field 2 = %n2|Field 3 = %n3|Field 4 = %n4|Field 5 = %n5|Field 6 = %n6|Field 7 = %n7|Field 8 = %n8"
    //% group=ThingSpeak
    //% write_api_key.defl=Khóa_Write_API_Key
    //% expandableArgumentMode="enabled"
    //% weight=75
    export function setData(write_api_key: string, n1: number = 0, n2: number = 0, n3: number = 0, n4: number = 0, n5: number = 0, n6: number = 0, n7: number = 0, n8: number = 0) {
        toSendStr = "GET /update?api_key="
            + write_api_key
            + "&field1="
            + n1
            + "&field2="
            + n2
            + "&field3="
            + n3
            + "&field4="
            + n4
            + "&field5="
            + n5
            + "&field6="
            + n6
            + "&field7="
            + n7
            + "&field8="
            + n8

        httpGetCmd = "GET:http://api.thingspeak.com/update?api_key="
            + write_api_key
            + "&field1="
            + n1
            + "&field2="
            + n2
            + "&field3="
            + n3
            + "&field4="
            + n4
            + "&field5="
            + n5
            + "&field6="
            + n6
            + "&field7="
            + n7
            + "&field8="
            + n8
    }
    function waitUPTSResponse(): boolean {
        let serial_str: string = ""
        let result: boolean = false
        let time: number = input.runningTime()
        while (true) {
            serial_str += serial.readString()
            if (serial_str.length > 200)
                serial_str = serial_str.substr(serial_str.length - 200)
            if (serial_str.includes("SEND OK")) {
                result = true
                break
            }
            else if (input.runningTime() - time > 10000) {
                break
            }
        }
        basic.pause(500)
        serial.readString()
        return result
    }
    /**
    * upload data. It would not upload anything if it failed to connect to Wifi or ThingSpeak.
    */
    //% block="Gửi dữ liệu lên ThingSpeak"
    //% group=ThingSpeak
    //% weight=70
    export function uploadData() {
        if (thingspeak_connected) {
            last_upload_successful = false
            sendAT("AT+CIPSEND=" + (toSendStr.length + 2), 100)
            sendAT(toSendStr, 100) // upload data
            
            sendCMD(httpGetCmd, 1000)
            
            last_upload_successful = waitUPTSResponse()
            
            basic.pause(100)
        }
    }



    /**
    * Check if ESP8266 successfully connected to ThingSpeak
    */
    //% block="Kết nối ThingSpeak %State?" 
    //% group=ThingSpeak
    //% weight=65
    export function thingSpeakState(state: boolean) {
        if (thingspeak_connected == state) {
            return true
        }
        else {
            return false
        }
    }


    /**
    * Check if ESP8266 successfully uploaded data to ThingSpeak
    */
    //% block="Gửi dữ liệu ThingSpeak %State?" 
    //% group=ThingSpeak
    //% weight=60
    export function tsLastUploadState(state: boolean) {
        if (last_upload_successful == state) {
            return true
        }
        else {
            return false
        }
    }
    //% block="Nút nhấn | TalkBack ID = %id_talkback | API Key = %api_key "
    //% group=ThingSpeak
    //% write_api_key.defl=Khóa_TalkBack
    //% expandableArgumentMode="enabled"
    //% weight=55
    export function requestButtonData(id_talkback: number = 0, api_key: string) :boolean{
        let button_status: boolean = false
        let url: string = ""
        url = "http://api.thingspeak.com/talkbacks/" + 
        id_talkback + "/commands.json?api_key=" + api_key
        
        sendCMD(url, 500)
        url = waitTalkBackResponse()
        if (url.includes("LED_TOG_OFF")){
            return true
        }
        return false
    }

    function waitTalkBackResponse(): string {
        let serial_str: string = ""

        let time: number = input.runningTime()
        while (true) {
            serial_str += serial.readString()
            if (serial_str.length > 200)
                serial_str = serial_str.substr(serial_str.length - 200)
            if (serial_str.includes("#")) {
                serial_str = serial_str.substr(serial_str.length - 1)
                break
            }
            else if (input.runningTime() - time > 5000) {
                break
            }
        }
        basic.pause(500)
        serial.readString()
        return serial_str
    }

    function writeToSerial(data: string, waitTime: number): void {
        serial.writeString(data + "\u000D" + "\u000A")
        if (waitTime > 0) {
            basic.pause(waitTime)
        }
    }
    // //% weight=50
    // //% blockId="wfb_at" block="execute AT command %command and then wait %waitTime ms"
    // export function executeAtCommand(command: string, waitTime: number): void {
    //     writeToSerial(command, waitTime)
    // }
    
    // //% weight=45
    // //% blockId="wfb_http" block="execute HTTP host: %host|port: %port|path: %urlPath||headers: %headers|body: %body"
    // export function executeHttpMethod(host: string, port: number, urlPath: string, headers?: string, body?: string): number {
    //     let myMethod: string
    //     let pauseBaseValue: number = 1000
    //     let led_on: number = -1
    //     let response: string

    //     myMethod = "GET"
    //     // Establish TCP connection:
    //     let data: string = "AT+CIPSTART=\"TCP\",\"" + host + "\"," + port
    //     writeToSerial(data, pauseBaseValue * 3)
    //     serial.onDataReceived(serial.delimiters(Delimiters.NewLine), function () {
    //         response += serial.readString()
    //     })
    //     data = myMethod + " " + urlPath + " HTTP/1.1" + "\u000D" + "\u000A"
    //         + "Host: " + host + "\u000D" + "\u000A"
   
    //     data += "\u000D" + "\u000A"
        
    //     // Send data:
    //     writeToSerial("AT+CIPSEND=" + (data.length + 2), pauseBaseValue * 3)
        
    //     response = ""
    //     writeToSerial(data, pauseBaseValue * 60)
        
    //     serial.onDataReceived(serial.delimiters(Delimiters.NewLine), () => { })

    //     if (response.includes("TOG_ON")) {
    //         led_on = 1;
    //     } else if (response.includes("TOG_OFF")) {
    //         led_on = 0;
    //     }

    //     // Close TCP connection:
    //     writeToSerial("AT+CIPCLOSE", pauseBaseValue * 3)
    //     return led_on
    // }

    //% block="Kết nối Adafruit | Username = %user_name | Key = %adafruit_key "
    //% group=Adafruit
    //% adafruit_key.defl=Khóa_Active_Key
    //% user_name.defl=Tài_Khoản
    //% weight=50
    export function adafruit_setting(user_name: string, adafruit_key: string): void {
        
        let data: string = ""
        data = "ADA:" + user_name + ":" + adafruit_key
        sendCMD(data, 200)
    }
    //% block="Gửi dữ liệu lên Adafruit | Feed = %feed_id | Value = %feed_value "
    //% group=Adafruit
    //% feed_id.defl=Tên_Feed
    //% feed_value.defl=Giá_Trị
    //% weight=45
    export function adafruit_post(feed_id: string, feed_value: string): void {
        let data: string = ""
        data = "POST_ADA:" + feed_id + ":" + feed_value
        sendCMD(data, 200)    
        waitUPTSResponse()
    }

    //% block="Nút nhấn trên Adafruit | Feed = %feed_id"
    //% group=Adafruit
    //% feed_id.defl=Tên_Feed
    //% weight=40
    export function adafruit_get(feed_id: string): string {
        let data: string = ""
        let result: string = ""
        data = "GET_ADA:" + feed_id
        sendCMD(data, 200)
        result = waitFeedResponse();
        if (result.length < 1){
            sendCMD(data, 200)
            result = waitFeedResponse();
        }
        return result
    }

    function waitFeedResponse(): string {
        let serial_str: string = ""
        
        let time: number = input.runningTime()
        
        while (true) {
            serial_str += serial.readString()
            if (serial_str.length > 200)
                serial_str = serial_str.substr(serial_str.length - 200)
            if (serial_str.includes("#")) {
                serial_str = serial_str.substr(0, serial_str.length - 1)
                break
            }
            else if (input.runningTime() - time > 5000) {
                break
            }
        }
        basic.pause(500)
        serial.readString()
        return serial_str
    }


    function waitGETResponse(): string {
        let serial_str: string = ""
        
        let time: number = input.runningTime()
        while (true) {
            serial_str += serial.readString()
            if (serial_str.length > 200)
                serial_str = serial_str.substr(serial_str.length - 200)
            if (serial_str.includes("SEND OK")) {
                break
            }
            else if (input.runningTime() - time > 10000) {
                break
            }
        }
        basic.pause(500)
        serial.readString()
        return serial_str
    }
    //% block="Kiểm tra Thời gian Internet"
    //% group='Thời gian Internet'
    //% weight=35
    export function request_check_clock(): void {
        let data: string = ""
        //data = "GET:http://www.iforce2d.net/test.php"
        data = "GET:http://103.170.122.203/time.php"
        sendCMD(data, 200)
        let response = waitGETResponse()
        const myArr = response.split(":")
        if(myArr.length == 6){
            internet_day = parseInt(myArr[0])
            internet_month = parseInt(myArr[1])
            internet_year = parseInt(myArr[2])

            internet_hour = parseInt(myArr[3])
            internet_minute = parseInt(myArr[4])
            internet_second = parseInt(myArr[5])
        }
        // const myArr = response.split(" ")
        // let clock_data = myArr[myArr.length - 3]
        // let clock_noon = myArr[myArr.length - 2]

        // const clock_split = clock_data.split(":")
        // if(clock_split.length == 3){
        //     internet_hour = parseInt(clock_split[0]) + 7
        //     internet_minute = parseInt(clock_split[1])
        //     internet_second = parseInt(clock_split[2])
        //     if(clock_noon.includes("PM")){
        //         if(internet_hour != 7)
        //             internet_hour += 12
        //     }
        //     if(internet_hour >= 24) internet_hour -= 24
        // }
    }

    //% block="Giờ"
    //% group='Thời gian Internet'
    //% weight=30
    export function get_internet_clock_hour(): number {
        return internet_hour
    }

    //% block="Phút"
    //% group='Thời gian Internet'
    //% weight=25
    export function get_internet_clock_minute(): number {
        return internet_minute
    }
    //% block="Giây"
    //% group='Thời gian Internet'
    //% weight=20
    export function get_internet_clock_second(): number {
        return internet_second
    }
    //% block="Ngày"
    //% group='Thời gian Internet'
    //% weight=15
    export function get_internet_clock_day(): number {
        return internet_day
    }
    //% block="Tháng"
    //% group='Thời gian Internet'
    //% weight=10
    export function get_internet_clock_month(): number {
        return internet_month
    }
    //% block="Năm"
    //% group='Thời gian Internet'
    //% weight=5
    export function get_internet_clock_year(): number {
        return internet_year
    }

}