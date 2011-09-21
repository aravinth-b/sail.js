// uses jquery.url.js --> https://github.com/allmarkedup/jQuery-URL-Parser

var Rollcall = window.Rollcall || {}

Rollcall.Client = function(url) {
    this.url = url
}

Rollcall.Client.prototype = {
    /**
     * Get the current authentication token (from the current URL, i.e. from "?token=123xyz")
     *
     * In the future we may also wan to check for a 'token' cookie.
     */
    getCurrentToken: function() {
        // $.url is from jquery.url.js and refers to the current url 
        // (i.e. the url of the page we are currently on)
        return this.token || $.url.param('token') || $.cookie('token')
    },
    
    setToken: function(token) {
        this.token = token
        $.url.param('token', token)
        $.cookie('token', token)
    },
    
    unsetToken: function() {
        this.token = null
        $.url.param('token', '')
        $.cookie('token', null)
    },
    
     
    /**
     * Redirect the user to the Rollcall login page for authentication.
     */
    redirectToLogin: function() {        
        window.location.replace(this.url+'/login?destination='+escape(window.location.href))
    },
    
    
    /**
     * Determine whether we can talk to rollcall over REST
     * or whetehr we have to use JSONP.
     * Due to the same-origin policy in web browsers, REST can
     * only be used if Rollcall is being served on the same
     * domain as this script; otherwise JSONP must be used.
     */
    canUseREST: function() {
        
        // using jquery.url.js here
        currentUrl = $.url.attr('source')
        $.url.setUrl(this.url)
        rollcallHost = $.url.attr('host')
        rollcallPort = $.url.attr('port')
        rollcallProtocol = $.url.attr('protocol')
        $.url.setUrl(currentUrl)
        
        return rollcallHost == null || (
                    rollcallHost == $.url.attr('host') 
                    && rollcallPort == $.url.attr('port')
                    && rollcallProtocol == $.url.attr('protocol')
                )
    },
    
    
    createSession: function(account, callback) {
        login = account.login
        password = account.password
        url = this.url + '/sessions.json'
        
        data = {
            session: {
                login: login,
                password: password
            }
        }
        
        callbackWrapper = function(data) {
            callback(data['session'])
        }
        
        this.request(url, 'POST', data, callbackWrapper)
    },
    
    // Creates a session for a group composed of the given members.
    // If the group doesn't yet exist, it is created automatically.
    createGroupSession: function(accounts, callback) {
        url = this.url + '/sessions/group.json'
        
        data = {
            logins: accounts,
            run_id: Sail.app.run.id
        }
        
        callbackWrapper = function(data) {
            callback(data['session'])
        }
        
        this.request(url, 'POST', data, callbackWrapper)
    },
    
    
    destroySessionForToken: function(token, callback) {
        rollcall = this
        
        url = rollcall.url + '/sessions/invalidate_token.json'
        
        this.request(url, 'DELETE', {token: token}, callback)
    },


    /**
     * Fetch session data for the given token.
     * If the session data is retrieved successfully, then given
     * callback is executed with the session data.
     */
    fetchSessionForToken: function(token, callback, errorCallback) {
        url = this.url + '/sessions/validate_token.json'
        
        this.request(url, 'GET', {token: token}, callback, errorCallback)
    },
    
    /**
     * Fetch the list of users.
     */
    fetchUsers: function(options, callback) {
        url = this.url + '/users.json'
        
        this.request(url, 'GET', options, callback)
    },
    
    /**
     * Fetch the list of runs.
     */
    fetchRuns: function(options, callback) {
        if (options.curnit) {
            url = this.url + '/curnits/'+options.curnit+'/runs.json'
        } else {
            url = this.url + '/runs.json'
        }
        
        this.request(url, 'GET', options, callback)
    },
    
    /**
     * Fetch run data for a run id or name.
     */
    fetchRun: function(id, callback) {
        url = this.url + '/runs/'+id+'.json'
        
        this.request(url, 'GET', {}, callback)
    },
    
    fetchGroup: function(login, callback) {
        url = this.url + '/groups/'+login+'.json'
        
        this.request(url, 'GET', {}, callback)
    },
    
    error: function(error) {
        alert(error.responseText)
    },
    
    request: function(url, method, params, callback, errorCallback) {
        if (this.canUseREST()) {
            this.requestUsingREST(url, method, params, callback, errorCallback)
        } else {
            this.requestUsingJSONP(url, method, params, callback, errorCallback)
        }
    },
    
    requestUsingREST: function(url, method, params, callback, errorCallback) {
        rollcall = this
        
        $.ajax({
            url: url,
            type: method,
            dataType: 'json',
            data: params,
            success: callback,
            error: function(error) {
                console.error("Error response from Rollcall at " + rollcall.url + ":", error)
                if (errorCallback)
                    errorCallback(error)
                else
                    rollcall.error(error)
            }
        })
    },
    
    requestUsingJSONP: function(url, method, params, callback, errorCallback) {
        rollcall = this
        
        params['_method'] = method
        
        wrappedCallback = function(data) {
            if (data.error) {
                console.error("Error response from Rollcall at " + rollcall.url + ":", data.error.data)
                if (errorCallback)
                    errorCallback(data.error.data)
                else
                    rollcall.error(data.error.data)
            } else {
                callback(data)
            }
        }
        
        return $.ajax({
            url: url,
            dataType: 'jsonp',
            data: params,
            success: wrappedCallback
        })
    }
}