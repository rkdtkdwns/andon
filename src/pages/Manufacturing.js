import React, {useContext, useEffect, useState} from 'react';
import {Typography, Descriptions, Button, Table, DatePicker, Space, Input, Modal, Spin, Select} from 'antd';
import {LeftOutlined, ShrinkOutlined, ArrowsAltOutlined} from "@ant-design/icons";
import { makeStyles } from "@material-ui/core/styles";
import {fetchManufacturingStatus, fetchTagResultData, fetchTagHistory, fetchTagStats} from "../db_service/service";
import Moment from 'moment';
import {commaNum} from "../utils/string";


const Manufacturing = (props) => {
    const classes = useStyles(props);
    const urlParams = {}
    let batchSize = 5;
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

        fetchManufacturingStatus(lineType, MRPType).then(async (res)=>{
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
        let candidates = productKeys
        let productMap = {}
        let dividerMap = {}
        let separator = ':'
        products.forEach(e=>{
            productMap[parseInt(e.PO_NUMBER_S)] = e
            dividerMap[e.DB_NAME + separator + e.TAG_INDEX] = e.PART_M30_CUSTOM_S
        })
        let currentProducts = candidates.map(e=>productMap[e])

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
            res.data.rows.forEach(e=>{
                let divider = dividerMap[dbName + separator + e.TagIndex];
                let key = dbName + '/' + e.TagIndex
                if(!tagValues.hasOwnProperty(key)){
                    tagValues[key] = parseInt((parseInt(e.Val) || 0) / divider)
                }
            })
        }

        let result = Object.entries(Object.assign({}, currentProducts)).sort(
            ([indexA, a], [indexB, b])=>{return a.MRP.localeCompare(b.MRP)
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
                            <Select.Option value="">전체</Select.Option>
                            <Select.Option value="FROZEN">냉동</Select.Option>
                            <Select.Option value="SEASONING">조미</Select.Option>
                            <Select.Option value="DRY">건면</Select.Option>
                            <Select.Option value="FRY">유탕면</Select.Option>
                        </Select>
                        <Select
                            placeholder={'제품군을 선택해주세요.'}
                            className={'manufacturing-select'}
                            style={{width: 200, marginLeft: 20, backgroundColor: '#212121'}}
                            value={MRPType || null}
                            onChange={(val)=>{
                                setMRPType(val)
                                // updateSearchParams('MRPType', val)
                            }}>
                            <Select.Option value="">전체</Select.Option>
                            <Select.Option value="M01">냉동밥</Select.Option>
                            <Select.Option value="M02">오니기리</Select.Option>
                            <Select.Option value="M03">냉동만두</Select.Option>
                            <Select.Option value="M04">튀김</Select.Option>
                            <Select.Option value="M05">핫도그</Select.Option>
                            <Select.Option value="M06">추출농축</Select.Option>
                            <Select.Option value="M07">HMR</Select.Option>
                            <Select.Option value="M08">조미소스</Select.Option>
                            <Select.Option value="M09">조미분말</Select.Option>
                            <Select.Option value="M10">냉장만두</Select.Option>
                            <Select.Option value="M11">건면 봉지</Select.Option>
                            <Select.Option value="M12">유탕면 봉지</Select.Option>
                            <Select.Option value="M14">건면 용기</Select.Option>
                            <Select.Option value="M15">유탕면 용기`</Select.Option>
                        </Select>
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
                }}
                >
                    생산실적현황
                </div>
            <table style={{width: '100%', color: '#fff', borderCollapse: 'collapse', border: '1px solid #fff'}}>
                <thead>
                    <tr>
                        <th className={classes.th}>품 목</th>
                        <th className={classes.th}>금일 목표</th>
                        <th className={classes.th}>내포장실적</th>
                        <th className={classes.th}>외포장실적</th>
                        <th className={classes.th}>달성률</th>
                    </tr>
                </thead>
                <tbody>
                {new Array(5).fill(1).map((x, i)=>{
                    let ci = (currentPage * batchSize) + i
                    let e = result[ci] || {}
                    let innerValue = e['innerValue']
                    return (
                        <tr key={i} style={{textAlign: 'center'}}>
                            <td className={classes.td}>{e['PART_NAME'] || '-'}</td>
                            <td className={classes.td}>{commaNum(e['PLANNED'])} {e['UOM'] || '-'}</td>
                            <td className={classes.td}>{innerValue ? commaNum(innerValue) + ' ' + e['UOM'] : '-'}</td>
                            <td className={classes.td}>{e['outerValue'] ? commaNum(e['outerValue']) + ' BOX' : '-'}</td>
                            <td className={classes.td}>{e['PLANNED'] ? (innerValue/e['PLANNED'] * 100).toFixed(1) + '%' : '-'}</td>
                        </tr>
                    )
                })}
                </tbody>
            </table>
            </div>
            <div style={{width: '100%'}}>
                <table  style={{width: '100%', color: '#fff', borderCollapse: 'collapse', border: '1px solid #fff'}}>
                    <tr style={{textAlign: 'center'}}>
                        <td className={classes.bottomTd}>전체 진척율(%)</td>
                        <td className={classes.bottomTd}>{(result.reduce((r, e)=>r+(e.innerValue || 0), 0)/result.reduce((r, e)=>r+(e.PLANNED || 0), 0) * 100).toFixed(1)}%</td>
                    </tr>
                </table>
            </div>
        </div>
    );
};

export default Manufacturing;


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
    }
});


const useStyles = makeStyles(styles);
