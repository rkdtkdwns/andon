import React, {useContext, useEffect, useState} from 'react';
import {Typography, Descriptions, Button, Table, DatePicker, Space, Input, Modal, Spin, Select} from 'antd';
import {LeftOutlined, ShrinkOutlined, ArrowsAltOutlined} from "@ant-design/icons";
import { makeStyles } from "@material-ui/core/styles";
import {
    fetchManufacturingStatus,
    fetchTagResultData,
    fetchTagHistory,
    fetchTagStats,
    fetchManufacturing2Status
} from "../db_service/service";
import Moment from 'moment';
import {useNavigate, useSearchParams} from "react-router-dom";
import {commaNum} from "../utils/string";

const parseQuery = (queryString) => {
    let query = {};
    let pairs = (queryString[0] === '?' ? queryString.substr(1) : queryString).split('&');
    for (let i = 0; i < pairs.length; i++) {
        let pair = pairs[i].split('=');
        query[pair[0]] = pair[1] || '';
    }
    return query;
}


const Manufacturing2 = (props) => {
    const classes = useStyles(props);
    // const urlParams = window.location.search ? (Object.fromEntries(new URLSearchParams(window.location.search)) || {}) : {};
    // const urlParams = window.location.search ? parseQuery(window.location.search) : {}
    const urlParams = {}
    let batchSize = 2;
    let [result, setResult] = useState([])
    let [currentPage, setCurrentPage] = useState(0);
    let [lineType, setLineType] = useState('')
    let [MRPType, setMRPType] = useState('')

    useEffect(()=>{
        let interval;
        let index = {current: 0};
        getData(index);
        interval = setInterval(()=>{
            getData(index);
        }, 10000)

        return () => {
            clearInterval(interval);
        }
    }, [lineType, MRPType]);
    const getData = (index) => {

        fetchManufacturing2Status(lineType, MRPType).then(async (res)=>{
            await fetchResults(res.data.rows, index);
            setCurrentPage(index.current)
            let uniqueKeys = Array.from(new Set(res.data.rows.map(e=>e.PO_NUMBER_S)));
            if(index.current >= Math.ceil(uniqueKeys.length / batchSize) - 1){
                index.current = 0
            }else{
                index.current += 1
            }
        });
    };

    const fetchResults = async (products, index) => {
        let MRPMap = {};
        let productTagMap = products.reduce((r, e)=>{
            MRPMap[e.PO_NUMBER_S] = e.MRP;
            if(!r.hasOwnProperty(e.PO_NUMBER_S)){
                r[e.PO_NUMBER_S] = {};
            }
            if(!r[e.PO_NUMBER_S].hasOwnProperty(e.LINE_DETAIL_S)){
                r[e.PO_NUMBER_S][e.LINE_DETAIL_S] = []
            }
            r[e.PO_NUMBER_S][e.LINE_DETAIL_S].push(e.DB_NAME + '/' + e.TAG_INDEX)
            return r
        }, {})


        let productKeys = Object.keys(productTagMap).sort((a, b)=>{
            return MRPMap[a].localeCompare(MRPMap[b])
        }).map(e=>parseInt(e));
        // let batchSize = 100;
        // let candidates = productKeys.slice(index.current * batchSize, (index.current + 1) * batchSize);
        let candidates = productKeys
        let productMap = {}
        products.forEach(e=>{
            productMap[parseInt(e.PO_NUMBER_S)] = e
        })
        let currentProducts = candidates.map(e=>productMap[e])

        // let maxIndex = Math.ceil(productKeys.length / batchSize) - 1;
        // index.current = index.current >= maxIndex ? 0 : index.current + 1;

        let separator = ':'
        let tagsMap = products.reduce((r, e)=>{
            if(candidates.indexOf(parseInt(e.PO_NUMBER_S)) < 0) return r
            let key = e.DB_NAME + separator + e.TAG_TABLE
            if(r.hasOwnProperty(key)){
                r[key].push(e.TAG_INDEX)
            }else{
                r[key] = [e.TAG_INDEX]
            }
            return r
        }, {})

        let entries = Object.entries(tagsMap);
        let tagValues = {};
        for(let i=0; i < entries.length; i++){
            let [key, tags] = entries[i];
            let [dbName, tableName] = key.split(separator)
            let res = await fetchTagResultData(dbName, tags, tableName);
            // console.log('DB', dbName);
            // console.log('Data', res.data.rows);
            res.data.rows.forEach(e=>{
                let key = dbName + '/' + e.TagIndex
                if(!tagValues.hasOwnProperty(key)){
                    tagValues[key] = parseInt((parseInt(e.Val) || 0) / e.PART_M30_CUSTOM_S)
                }
            })
        }

        let result = Object.entries(Object.assign({}, currentProducts)).sort(([indexA, a], [indexB, b])=>{
            return a.MRP.localeCompare(b.MRP)
        }).map(([poNumber, e])=>{
            let lines = productTagMap[e.PO_NUMBER_S] || []
            e.innerValue = e.innerValue || 0
            e.outerValue = e.outerValue || 0

            Object.entries(lines).forEach(([type, tags])=>{
                if(type.endsWith('OUTER')){
                    e.outerValue += tags.reduce((r, x)=>r + (tagValues[x] || 0), 0)
                }else{
                    e.innerValue += tags.reduce((r, x)=>r + (tagValues[x] || 0), 0)
                }
            })
            return e
        })
        // console.log('Result', result)
        setResult(result)
    }

    return (
        <div style={{
            minWidth: '100%', height: '100vh', overflow: 'auto',
            backgroundColor: '#212121', fontWeight: 'bolder',
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
        }}>
            <div style={{padding: '10px'}}>
                <div style={{fontSize: window.innerWidth * 0.0274, color: '#fff', display: 'flex', justifyContent: 'space-between'}}>
                    <div style={{display: 'flex', alignItems: 'center'}}>
                        <div>{new Moment().utcOffset('+0900').format('YYYY-MM-DD')}</div>
                        <Select
                            placeholder={'라인을 선택해주세요.'}
                            className={'manufacturing-select'}
                            style={{width: 200, marginLeft: 20, backgroundColor: '#212121'}}
                            value={lineType || null}
                            onChange={(val)=>{
                                setLineType(val)
                                // updateSearchParams('lineType', val)
                            }}>
                            <Select.Option value="DRY">건면</Select.Option>
                            <Select.Option value="FRY">유탕면</Select.Option>
                        </Select>
                        {/*<Select*/}
                        {/*    placeholder={'제품군을 선택해주세요.'}*/}
                        {/*    className={'manufacturing-select'}*/}
                        {/*    style={{width: 200, marginLeft: 20, backgroundColor: '#212121'}}*/}
                        {/*    value={MRPType || null}*/}
                        {/*    onChange={(val)=>{*/}
                        {/*        setMRPType(val)*/}
                        {/*        // updateSearchParams('MRPType', val)*/}
                        {/*    }}>*/}
                        {/*    <Select.Option value="">전체</Select.Option>*/}
                        {/*    <Select.Option value="M01">냉동밥</Select.Option>*/}
                        {/*    <Select.Option value="M02">오니기리</Select.Option>*/}
                        {/*    <Select.Option value="M03">냉동만두</Select.Option>*/}
                        {/*    <Select.Option value="M04">튀김</Select.Option>*/}
                        {/*    <Select.Option value="M05">핫도그</Select.Option>*/}
                        {/*    <Select.Option value="M06">추출농축</Select.Option>*/}
                        {/*    <Select.Option value="M07">HMR</Select.Option>*/}
                        {/*    <Select.Option value="M08">조미소스</Select.Option>*/}
                        {/*    <Select.Option value="M09">조미분말</Select.Option>*/}
                        {/*    <Select.Option value="M10">냉장만두</Select.Option>*/}
                        {/*    <Select.Option value="M11">건면 봉지</Select.Option>*/}
                        {/*    <Select.Option value="M12">유탕면 봉지</Select.Option>*/}
                        {/*    <Select.Option value="M14">건면 용기</Select.Option>*/}
                        {/*    <Select.Option value="M15">유탕면 용기`</Select.Option>*/}
                        {/*</Select>*/}
                    </div>
                    <div style={{display: 'flex'}}>
                        <TimeClock/>
                        <div
                            style={{marginLeft: 10}}
                            onClick={()=>{window.location = urlParams.hidesider ? '?' : '?hidesider=true'}}>
                            {urlParams.hidesider ? <ShrinkOutlined/> : <ArrowsAltOutlined/>}
                        </div>
                    </div>
                </div>
                <div
                    style={{
                        border: '1px solid #fff', letterSpacing: '30px', color: '#fff',
                        fontSize: window.innerWidth * 0.022, textAlign: 'center'
                    }}>생산실적현황</div>
                <div style={{display: 'flex'}}>
                    {new Array(batchSize).fill(1).map((x, i)=>{
                        let ci = (currentPage * batchSize) + i
                        let e = result[ci] || {}
                        if(i % 2 === 0 ) {
                            e = result.find(e => ['M14', 'M15'].includes(e.MRP))
                        } else {
                            e = result.find(e => ['M11', 'M12'].includes(e.MRP))
                        }
                        let innerValue = e?.innerValue
                        return (
                            <div style={{width: '50%'}}>
                                <div className={classes.name}>{e && e['PART_NAME'] || '-'}</div>
                                <div style={{display: 'flex'}}>
                                    <div style={{width: '50%'}} className={classes.title}>
                                        목표
                                    </div>
                                    <div style={{width: '50%'}} className={classes.title}>
                                        실적
                                    </div>
                                </div>
                                <div style={{display: 'flex'}}>
                                    <div style={{width: '33.333%'}} className={classes.title}>
                                        <div style={{margin: '50% 0', color: 'yellow'}}>
                                            {e && commaNum(e['PLANNED'])} <br/>
                                            {e && e['UOM'] || '-'}
                                        </div>
                                    </div>
                                    <div style={{width: '33.333%'}}>
                                        <div style={{
                                            height: '50%', borderBottom: '1px solid white'
                                        }} className={classes.title2}>
                                            외포장실적<br/>
                                            {i % 2 === 0 ? '(용기면)' : '(봉지면)'}
                                        </div>
                                        <div style={{height: '50%'}} className={classes.title2}>
                                            내포장실적<br/>
                                            {i % 2 === 0 ? '(용기면)' : '(봉지면)'}
                                        </div>
                                    </div>
                                    <div style={{width: '33.333%'}} className={classes.title}>
                                        <div style={{
                                            height: '50%', borderBottom: '1px solid white', color: 'yellow'
                                        }} className={classes.title2}>
                                            {e && e['outerValue'] ? commaNum(e['outerValue']) + ' BOX' : '-'}
                                        </div>
                                        <div style={{
                                            height: '50%', color: 'yellow'
                                        }} className={classes.title2}>
                                            {e && innerValue ? commaNum(innerValue) + ' ' + e['UOM'] : '-'}
                                        </div>
                                    </div>
                                </div>
                                <div style={{display: 'flex'}}>
                                    <div style={{width: '33.333%'}} className={classes.title}>
                                        유통기한
                                    </div>
                                    <div
                                        style={{width: '66.666%', color: 'yellow'}}
                                        className={classes.title}>
                                        {e?.Expire_Date || '-'}
                                    </div>
                                </div>
                                <div style={{display: 'flex'}}>
                                    <div style={{width: '33.333%'}} className={classes.title}>
                                        달성률(%)
                                    </div>
                                    <div
                                        style={{width: '66.666%', color: 'yellow'}}
                                        className={classes.title}>
                                        {e?.PLANNED ? (innerValue/e['PLANNED'] * 100).toFixed(1) + '%' : '-'}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    );
};

export default Manufacturing2;


const TimeClock = (props) => {
    let [now, setNow] = useState(new Moment().utcOffset('+0900'))

    useEffect(()=>{
        let interval = setInterval(()=>{
            setNow(new Moment().utcOffset('+0900'))
        }, 1000)

        return ()=>{clearInterval(interval)}
    }, [])

    return (
        <div style={props.style}>
            {now.format('HH:mm:ss')}
        </div>
    )
};


const styles = (theme) => ({
    th: {
        border: '1px solid #fff',
        padding: '10px 10px',
        fontSize: window.innerWidth * 0.022,
        minWidth: window.innerWidth * 0.025 * 6
    },
    td: {
        border: '1px solid #fff',
        paddingLeft: 10,
        paddingRight: 10,
        paddingTop: window.innerHeight * 0.028,
        paddingBottom: window.innerHeight * 0.028,
        fontSize: window.innerWidth * 0.023,
    },
    bottomTd: {
        border: '1px solid #fff',
        fontSize: window.innerWidth * 0.026,
        minWidth: window.innerWidth * 0.025 * 6,
        color: 'yellow'
    },
    name: {
        color: '#fff',
        textAlign: 'center',
        border: '1px solid #fff',
        paddingTop: window.innerHeight * 0.015,
        paddingBottom: window.innerHeight * 0.015,
        fontSize: window.innerWidth * 0.02,
        verticalAlign: 'middle',
    },
    title: {
        color: '#fff',
        textAlign: 'center',
        border: '1px solid #fff',
        fontSize: window.innerWidth * 0.027,
        verticalAlign: 'middle',
    },
    title2: {
        color: '#fff',
        textAlign: 'center',
        border: '1px solid #fff',
        paddingTop: window.innerHeight * 0.03,
        paddingBottom: window.innerHeight * 0.03,
        fontSize: window.innerWidth * 0.025,
        verticalAlign: 'middle',
    }
});


const useStyles = makeStyles(styles);
